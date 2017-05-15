require 'pdf-reader'
require 'json'
require 'pathname'

require_relative 'extractor'

# CODE TAKEN
class CustomLayout < PDF::Reader::PageLayout
  attr_reader :runs
  def group_chars_into_runs(chars)
    chars.uniq! {|val| {x: val.x, y: val.y, text: val.text}}
    super
  end
end

class CustomReceiver < PDF::Reader::PageTextReceiver
  attr_reader :characters, :mediabox
  private
  def internal_show_text(string)
    if @state.current_font.nil?
      raise PDF::Reader::MalformedPDFError, "current font is invalid"
    end
    glyphs = @state.current_font.unpack(string)
    glyphs.each_with_index do |glyph_code, index|
      newx, newy = @state.trm_transform(0,0)
      utf8_chars = @state.current_font.to_utf8(glyph_code)
      glyph_width = @state.current_font.glyph_width(glyph_code) / 1000.0
      th = 1
      scaled_glyph_width = glyph_width * @state.font_size * th
      @characters << PDF::Reader::TextRun.new(newx, newy, scaled_glyph_width, @state.font_size, utf8_chars)
      @state.process_glyph_displacement(glyph_width, 0, utf8_chars == SPACE)
    end
  end
end

#END OF CODE TAKEN

class PDFTextProcessor
  
  def self.process(pdf_io, image_output)

    #goes to the beginning, creates a new reader, fails if file empty
    pdf_io.rewind
    reader = PDF::Reader.new(pdf_io) 
    if reader.pages.empty? then fail 'Could not find any pages in the given document' end


    text_receiver = CustomReceiver.new
    extractor = ExtractImages::Extractor.new(image_output)

    allruns = []
    reader.pages.each do |page|
      unless page.nil?
        page.walk(text_receiver)
        runs = CustomLayout.new(text_receiver.characters, text_receiver.mediabox).runs
        runs.sort! {|r1, r2| r2.y == r1.y ? r1.x <=> r2.x : r2.y <=> r1.y}
        allruns += runs

        images = extractor.page(page)
        
        allruns += images
      end
    end
    allruns
  end
end

def heal_stringCZ (string)
    string.gsub!('Æ', 'á')
    string.gsub!('Ø', 'é')
    string.gsub!('•', 'ů')
    string.gsub!('”', 'ž')
    string.gsub!('†', 'š')
    string.gsub!('œ', 'ú')
    string.gsub!('·', 'ť')
    string.gsub!('‹', 'ň')
    string
end

def equals_roughly(source, target)
  source > 0.98 * target && source < 1.02 * target
end

class RunProcessor

  def initialize(runs)
    @enum = runs.to_enum
    @root = {}
    @root[:chapters] = []
    #@root[:background_color] = "inherit"
    #@root[:font_color] = "inherit"

    @previous = nil
    @current = @enum.next
  end


  def advance
    @previous = @current
    @current = @enum.next
  end 

  def skip
    @current = @enum.next
  end

  def seek(type)
    while get_run_type(@current) != type do
      advance
    end
  end

  def get_json
    thesis_name = get_thesis_name
    author_name = get_author_name
    #puts "Thesis name: " << thesis_name
    #puts "Author name: " << author_name
    @root[:paper_name] = thesis_name
    @root[:author] = author_name

    hack_skip_to_beginning

    while true do 
      chapt = parse_chapter
      if !chapt then break end
      @root[:chapters] << chapt
    end

    return @root.to_json
  end

  def get_run_type(run)

    if !run.is_a?(PDF::Reader::TextRun) then return :unknown end

  run_type = case run.font_size
    when 35
      :chapter_number
    when 24
      :chapter_name
    when 17
      :thesis_name
    when 14
      :subchapter_lvl1
    when 11
      :subchapter_lvl2
    when 10
      :text
    when 8
      :footer_note
    when 7
      :index
    when 5
      :footer_index
    else
      :unknown
    end
  end

  def get_thesis_name
    thesis_name = String.new

    seek :thesis_name

    thesis_name << heal_stringCZ( @current.text )
    advance

    while get_run_type(@current) == :thesis_name do
      thesis_name << " " << heal_stringCZ( @current.text )
      advance
    end
    return thesis_name
  end

  def get_author_name
    author_name = String.new
    while get_run_type(@current) == :subchapter_lvl1 do
      author_name << heal_stringCZ( @current.text )
      advance
    end
    return author_name
  end

  def get_chapter_name
    seek :chapter_name          # skip number if present

    chapter_name = heal_stringCZ( @current.text )
    advance
    while get_run_type(@current) == :chapter_name do          # get chapter name
      chapter_name << " " << heal_stringCZ( @current.text )
      advance
    end
    
    return chapter_name
  end

  def hack_skip_to_beginning
    seek :chapter_number
  end

  def is_joinable
    if !@previous || !@previous.is_a?(PDF::Reader::TextRun)
      return false
    end

    #evaluates true if the same font && (on same/successive lines || on different pages)
    @current.font_size == @previous.font_size && ( (@current.y - @previous.y).abs < 13.8 ) #||  @previous.y - @current.y < -500 )
  end


  def save_content_or_label (content, labels, current_object)
    return if !current_object
    text = current_object[:text]
    if text.start_with?("Obr.", "Obrázek")
      labels << current_object[:text]
      #puts "This is a label: #{current_object[:text]}"
    else
      content << current_object
    end
  end

  def parse_chapter
    begin
    chapter_name = get_chapter_name
    
    rescue StopIteration
      return nil
    end

    
    content = []
    images = []
    labels = []
    current_object = nil

    begin
      while true do #------------- MAIN LOADING LOOP


        if @current.is_a? String
          if current_object
            #content << current_object
            save_content_or_label(content, labels, current_object)
            current_object = nil
          end

          images << @current
          #puts "parsing found image #{@current} in chapter #{chapter_name}"
          advance
          next
        end


        if equals_roughly(@current.y, 94.69) || equals_roughly(@current.y, 739.48)
          #puts "header/footer, ignored: #{@current.text}"
          #advance
          skip
          next
        end


        if is_joinable
          if !current_object
            advance
            next
          end

          current_text = current_object[:text]
          if current_text[-1] == "-"
            current_text.chomp!("-")
            current_object[:text] << heal_stringCZ( @current.text )
            advance
            next
          end

          current_object[:text] << " " << heal_stringCZ( @current.text )
          advance
          next
        end

        if get_run_type(@current) == :chapter_name
          #content << current_object unless !current_object
          save_content_or_label(content, labels, current_object) unless !current_object

          if content[-1] && content[-1][:type] == "text/large" #&& content[-2] && content[-2][:type] == "text/large"
            content.pop
            #content.pop
          end

          break
        end


        if current_object
          #content << current_object
          save_content_or_label(content, labels, current_object)
          current_object = nil
        end

        #create new hash
        current_object = {}

        if get_run_type(@current) == :text
          current_object[:type] = "text/normal"
          current_object[:text] = heal_stringCZ @current.text
        elsif get_run_type(@current) == :subchapter_lvl1
          current_object[:type] = "text/large"
          current_object[:text] = heal_stringCZ @current.text
        elsif get_run_type(@current) == :subchapter_lvl2
          current_object[:type] = "text/plus"
          current_object[:text] = heal_stringCZ @current.text
        else
          current_object = nil
          #current_object[:type] = "text/small"
          #current_object[:text] = "UNKNOWN CONTENT" #heal_stringCZ @current.text
        end

        advance
      end
    rescue StopIteration
      #content << current_object
      save_content_or_label(content, labels, current_object)
    end
    return {name: chapter_name, content: content, images: images, labels: labels}
  end


end



#------- MAIN CODE
if !File.exists?("#{ARGV[0]}") || !File.file?("#{ARGV[0]}")
  puts "Cannot open file '#{ARGV[0]}' (or no file given)"
  exit 1
end

if !File.exists?("#{ARGV[1]}") || !File.directory?("#{ARGV[1]}")
  puts "Second argument is not a directory."
  exit 1
end


file = File.open("#{ARGV[0]}", "rb")
runs = PDFTextProcessor.process(file, ARGV[1])
processor = RunProcessor.new(runs)
puts processor.get_json
exit 0
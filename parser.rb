require 'pdf-reader'
require 'json'


def equals_roughly(source, target)
  source > 0.98 * target && source < 1.02 * target
end


def heal_stringCZ (string)
    string.gsub!('Æ', 'á');
    string.gsub!('Ø', 'é');
    string.gsub!('•', 'ů');
    string.gsub!('”', 'ž');
    string.gsub!('†', 'š');
    string.gsub!('œ', 'ú');
    string
end


# CODE TAKEN
class CustomPageLayout < PDF::Reader::PageLayout
  attr_reader :runs
  # we need to filter duplicate characters which seem to be caused by shadowing
  def group_chars_into_runs(chars)
    # filter out duplicate chars before going on with regular logic,
    # seems to happen with shadowed text
    chars.uniq! {|val| {x: val.x, y: val.y, text: val.text}}
    super
  end
end


class PageTextReceiverKeepSpaces < PDF::Reader::PageTextReceiver
  # We must expose the characters and mediabox attributes to instantiate PageLayout
  attr_reader :characters, :mediabox

  private
  def internal_show_text(string)
    if @state.current_font.nil?
      raise PDF::Reader::MalformedPDFError, "current font is invalid"
    end
    glyphs = @state.current_font.unpack(string)
    glyphs.each_with_index do |glyph_code, index|
      # paint the current glyph
      newx, newy = @state.trm_transform(0,0)
      utf8_chars = @state.current_font.to_utf8(glyph_code)
 
      # apply to glyph displacment for the current glyph so the next
      # glyph will appear in the correct position
      glyph_width = @state.current_font.glyph_width(glyph_code) / 1000.0
      th = 1
      scaled_glyph_width = glyph_width * @state.font_size * th
 
      # modification to the original pdf-reader code which otherwise accidentally removes spaces in some cases
      # unless utf8_chars == SPACE
      @characters << PDF::Reader::TextRun.new(newx, newy, scaled_glyph_width, @state.font_size, utf8_chars)
      # end
 
      @state.process_glyph_displacement(glyph_width, 0, utf8_chars == SPACE)
    end
  end
end

#END OF CODE TAKEN

 #CODE TAKEN AND CUSTOMIZED
class PDFTextProcessor
  
  def self.process(pdf_io, pages = nil)

    #goes to the beginning, creates a new reader, fails if file empty
    pdf_io.rewind
    reader = PDF::Reader.new(pdf_io) 
    if reader.pages.empty? then fail 'Could not find any pages in the given document' end

    text_receiver = PageTextReceiverKeepSpaces.new
    
    allruns = []
    reader.pages.each do |page|
      unless page.nil?
        page.walk(text_receiver)
        runs = CustomPageLayout.new(text_receiver.characters, text_receiver.mediabox).runs
        # sort text runs from top left to bottom right
        # read as: if both runs are on the same line first take the leftmost, else the uppermost - (0,0) is bottom left
        runs.sort! {|r1, r2| r2.y == r1.y ? r1.x <=> r2.x : r2.y <=> r1.y}
        allruns += runs 
      end
    end
    allruns
  end
end

class RunProcessor

  def initialize(runs)
    @enum = runs.to_enum
    @root = {}
    @root[:chapters] = []
    @root[:background_color] = "inherit"
    @root[:font_color] = "inherit"

    @previous = nil
    @current = @enum.next
  end


  def advance
    @previous = @current
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

    hack_skip_to_beginning        # REPLACE WITH LOAD META

    hash = parse_chapter
    @root[:chapters] = [hash]

    return @root.to_json
  end

  def get_run_type(run)
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

    thesis_name << @current.text
    advance

    while get_run_type(@current) == :thesis_name do
      thesis_name << " " << @current.text
      advance
    end
    return thesis_name
  end

  def get_author_name
    author_name = String.new
    while get_run_type(@current) == :subchapter_lvl1 do
      author_name << @current.text
      advance
    end
    return author_name
  end

  def get_chapter_name
    seek :chapter_name          # skip number if present

    chapter_name = String.new
    while get_run_type(@current) == :chapter_name do          # get chapter name
      chapter_name << @current.text
      advance
    end
  end

  def hack_skip_to_beginning
    seek :chapter_number
    #puts "Skipped to: #{@current.text}"
  end

  def is_joinable
    if !@previous then return false end
    @current.font_size == @previous.font_size && (@current.y - @previous.y).abs < 13.65
  end

  def parse_chapter
    begin
    chapter_name = get_chapter_name
    rescue StopIteration
      return nil
    end

    #puts "Chapter name: #{chapter_name}"
    content = []
    current_object = nil

    begin
      while true do #------------- MAIN LOADING LOOP

        if equals_roughly(@current.y, 94.69) || equals_roughly(@current.y, 739.48)
          #puts "header/footer, ignored: #{@current.text}"
          advance
          next
        end


        if is_joinable
          #puts "joined: #{@current.text}"
          current_object[:text] << " " << @current.text
          advance
          next
        end

      

        if get_run_type(@current) == :chapter_name
          #puts "---- END OF CHAPTER ----"
          content << current_object
          break
        end


        if current_object
          content << current_object
          current_object = nil
        end

        #create new hash
        current_object = {}

        if get_run_type(@current) == :text
          current_object[:type] = "text/normal"
          current_object[:text] = @current.text
        elsif get_run_type(@current) == :subchapter_lvl1
          current_object[:type] = "text/large"
          current_object[:text] = @current.text
        elsif get_run_type(@current) == :subchapter_lvl2
          current_object[:type] == "text/plus"
          current_object[:text] = @current.text
        else
          current_object[:type] == "unknown"
          current_object[:text] = @current.text
        end

        #puts "created object of type #{current_object[:type]}"
        #puts "#{current_object[:text]}"
        advance
      end
    rescue StopIteration
      content << current_object
      puts "rescued iteration at large loop"
    end


    return {name: chapter_name, content: content}
  end


end



#------- MAIN CODE
if File.exists?("#{ARGV[0]}")
  file = File.open("#{ARGV[0]}")
  runs = PDFTextProcessor.process(file)
  processor = RunProcessor.new(runs)
  puts processor.get_json
  return 0
else
  puts "Cannot open file '#{ARGV[0]}' (or no file given)"
  return 1
end
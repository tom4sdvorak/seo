 require 'pdf-reader'
 require 'json'


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
  MAX_KERNING_DISTANCE = 10 # experimental value
 
  # pages may specify which pages to actually parse (zero based)
  #   [0, 3] will process only the first and fourth page if present
  def self.process(pdf_io, pages = nil)

    #goes to the beginning, creates a new reader, fails if file empty
    pdf_io.rewind
    reader = PDF::Reader.new(pdf_io) 
    fail 'Could not find any pages in the given document' if reader.pages.empty?

    text_receiver = PageTextReceiverKeepSpaces.new
    requested_pages = pages ? reader.pages.values_at(*pages) : reader.pages
    allruns = []
    requested_pages.each do |page|
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


def equals_roughly(source, target)
  source > 0.97 * target && source < 1.03 * target
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

def get_thesis_name(enum)
  thesis_name = String.new

  while get_run_type(enum.peek) != :thesis_name do
    puts "waiting for thesis name"
    enum.next
  end

  thesis_name << enum.next.text

  while get_run_type(enum.peek) == :thesis_name do
    thesis_name << " " << enum.next.text
  end
return thesis_name
end

def get_author_name(enum)
  author_name = String.new
  while get_run_type(enum.peek) == :subchapter_lvl1 do
    author_name << enum.next.text
  end
  return author_name
end


def process_runs(runs)
  enum = runs.to_enum
  thesis_name = get_thesis_name(enum)
  author_name = get_author_name(enum)
  puts "Thesis name: " << thesis_name
  puts "Author name: " << author_name
end

def parse_chapter(enum)
  chapter_name = String.new

  while get_run_type(enum.peek) == :chapter_name do
    chapter_name << enum.next.text
  end

  while true do #------------- MAIN LOADING LOOP
    run = enum.next

    puts run


  end


end


if File.exists?('input/cvachond_2014bach.pdf')#ARGV[0])
  file = File.open('input/cvachond_2014bach.pdf')#ARGV[0])
  runs = PDFTextProcessor.process(file)
  process_runs(runs)

else
  puts "Cannot open file '#{ARGV[0]}' (or no file given)"
  return 1
end


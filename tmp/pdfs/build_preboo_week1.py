from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


OUT = "output/pdf/pre-boo-september-week-1-before-class.pdf"
W, H = A4
M = 18 * mm
BLACK = colors.HexColor("#111111")
MID = colors.HexColor("#6A6A6A")
LIGHT = colors.HexColor("#E8E8E8")
PALE = colors.HexColor("#F5F5F5")


def para(c, text, x, y_top, width, style):
    p = Paragraph(text, style)
    _, h = p.wrap(width, H)
    p.drawOn(c, x, y_top - h)
    return h


def header(c, section, page_no):
    y = H - 15 * mm
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(M, y, "THE BOOHA ADVENTURE")
    c.setFont("Helvetica-Bold", 8.5)
    c.drawRightString(W - M, y, "PRE-BOO / SEPTEMBER")
    c.setStrokeColor(BLACK)
    c.setLineWidth(1)
    c.line(M, y - 6 * mm, W - M, y - 6 * mm)
    c.setFillColor(MID)
    c.setFont("Helvetica", 8)
    c.drawString(M, 10 * mm, section)
    c.drawRightString(W - M, 10 * mm, f"{page_no:02d}")


def section_label(c, text, x, y, width=None):
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(x, y, text.upper())
    if width:
        c.setStrokeColor(BLACK)
        c.setLineWidth(0.8)
        c.line(x, y - 4, x + width, y - 4)


def answer_lines(c, x, y, width, count=1, gap=21):
    c.setStrokeColor(colors.HexColor("#777777"))
    c.setLineWidth(0.55)
    for i in range(count):
        c.line(x, y - i * gap, x + width, y - i * gap)


def question(c, number, text, y, lines=1, width=None):
    if width is None:
        width = W - 2 * M - 12 * mm
    qstyle = ParagraphStyle(
        f"q{number}", fontName="Helvetica", fontSize=11.3,
        leading=15, textColor=BLACK, spaceAfter=0,
    )
    x = M + 8 * mm
    h = para(c, f"{number}. {text}", x, y, width, qstyle)
    line_y = y - h - 12
    answer_lines(c, x, line_y, width - 4 * mm, lines)
    return h + 18 + max(0, lines - 1) * 21


def make_cover(c):
    c.setFillColor(colors.white)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(M, H - 15 * mm, "THE BOOHA ADVENTURE")
    c.drawRightString(W - M, H - 15 * mm, "PRE-BOO")
    c.setStrokeColor(BLACK)
    c.setLineWidth(1.2)
    c.line(M, H - 22 * mm, W - M, H - 22 * mm)

    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 76)
    c.drawString(M, H - 82 * mm, "PRE-BOO")

    c.setFont("Helvetica-Bold", 44)
    c.drawString(M, H - 112 * mm, "READING")
    c.drawString(M, H - 132 * mm, "COMPREHENSION")

    c.setFillColor(BLACK)
    c.rect(M, H - 166 * mm, W - 2 * M, 15 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(M + 6 * mm, H - 157 * mm, "SEPTEMBER / WEEK 01")

    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(M, H - 192 * mm, "BEFORE CLASS")

    c.setStrokeColor(BLACK)
    c.setLineWidth(1)
    c.line(M, 35 * mm, W - M, 35 * mm)
    c.setFont("Helvetica", 10)
    c.setFillColor(MID)
    c.drawString(M, 26 * mm, "Read. Think. Answer.")
    c.drawRightString(W - M, 26 * mm, "Name: __________________________")
    c.showPage()


def make_reading(c):
    header(c, "September Week 1 / Before Class", 2)
    top = H - 40 * mm
    section_label(c, "Reading 01", M, top)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 30)
    c.drawString(M, top - 16 * mm, "Before Class")
    c.setFillColor(MID)
    c.setFont("Helvetica", 10)
    c.drawString(M, top - 25 * mm, "Read the story twice. Notice what happens first, next, and last.")

    box_x = M
    box_y = top - 39 * mm
    box_w = W - 2 * M
    box_h = 130 * mm
    c.setFillColor(PALE)
    c.setStrokeColor(BLACK)
    c.setLineWidth(1)
    c.roundRect(box_x, box_y - box_h, box_w, box_h, 3 * mm, fill=1, stroke=1)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(box_x + 8 * mm, box_y - 10 * mm, "THE STORY")
    c.setStrokeColor(BLACK)
    c.setLineWidth(0.7)
    c.line(box_x + 8 * mm, box_y - 14 * mm, box_x + box_w - 8 * mm, box_y - 14 * mm)

    body = ParagraphStyle(
        "story", fontName="Helvetica", fontSize=15, leading=23,
        textColor=BLACK, spaceAfter=0,
    )
    story = (
        "It is Monday morning, and Miki is early for class. She goes to her "
        "classroom and sits in her chair. She puts her pencil case, notebook, "
        "and textbook on her desk. She takes out a pencil, an eraser, and a ruler.<br/><br/>"
        "The teacher writes instructions on the board: <b>\"Make a paper picture.\"</b> "
        "Miki also needs scissors and glue. She looks in her locker, but the "
        "scissors are not there. She asks Ken for help. Ken finds the scissors "
        "near the computer.<br/><br/>"
        "Miki finishes her picture. She puts the paper scraps in the trash can. "
        "When the bell rings, Miki is ready for class."
    )
    para(c, story, box_x + 8 * mm, box_y - 22 * mm, box_w - 16 * mm, body)

    note_y = box_y - box_h - 20 * mm
    section_label(c, "Reader's note", M, note_y)
    note_style = ParagraphStyle(
        "note", fontName="Helvetica", fontSize=12, leading=18,
        textColor=BLACK,
    )
    para(c, "Miki has a small problem. Find the problem and follow how it is solved.", M, note_y - 9 * mm, W - 2 * M, note_style)
    c.showPage()


def make_questions(c):
    header(c, "September Week 1 / Before Class", 3)
    top = H - 40 * mm
    section_label(c, "Comprehension Questions", M, top)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(M, top - 16 * mm, "Show what you understood.")

    c.setFillColor(MID)
    c.setFont("Helvetica", 9.5)
    c.drawString(M, top - 24 * mm, "Name: ________________________________    Date: __________________")

    y = top - 36 * mm
    y -= question(c, 1, "When does Miki go to the classroom?", y, lines=1)
    y -= question(c, 2, "What three things does Miki put on her desk?", y, lines=2)
    y -= question(c, 3, "What does the teacher write on the board?", y, lines=1)
    y -= question(c, 4, "What is missing from Miki's locker?", y, lines=1)
    y -= question(c, 5, "Where does Ken find the scissors?", y, lines=1)
    y -= question(c, 6, "Why does Miki ask Ken for help?", y, lines=2)

    c.setFillColor(BLACK)
    qstyle = ParagraphStyle("q7", fontName="Helvetica", fontSize=11.3, leading=15, textColor=BLACK)
    para(c, "7. Put the events in the correct order. Write 1, 2, 3, or 4 on each line.", M + 8 * mm, y, W - 2 * M - 12 * mm, qstyle)
    y -= 25
    events = [
        "Miki looks in her locker.",
        "Miki puts her things on her desk.",
        "Ken finds the scissors.",
        "Miki puts the paper scraps in the trash can.",
    ]
    for event in events:
        c.setStrokeColor(BLACK)
        c.setLineWidth(0.8)
        c.rect(M + 8 * mm, y - 3, 13, 13, fill=0, stroke=1)
        para(c, event, M + 16 * mm, y + 7, W - 2 * M - 20 * mm, qstyle)
        y -= 24

    y -= 8
    question(c, 8, "What does Miki do when the bell rings?", y, lines=2)
    c.showPage()


def main():
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("Pre-Boo September Week 1 - Before Class")
    c.setAuthor("The Booha Adventure")
    make_cover(c)
    make_reading(c)
    make_questions(c)
    c.save()


if __name__ == "__main__":
    main()

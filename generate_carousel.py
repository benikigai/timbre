import os
from PIL import Image, ImageDraw, ImageFont

# Canvas dimensions
WIDTH = 1080
HEIGHT = 1350

# Colors
BG_COLOR = (13, 17, 15)       # #0D110F
SAGE_COLOR = (127, 169, 139)   # #7FA98B
AMBER_COLOR = (232, 165, 116)  # #E8A574
GOLD_COLOR = (244, 216, 160)   # #F4D8A0
INK_COLOR = (242, 239, 229)    # #F2EFE5
MUTED_COLOR = (150, 150, 140)

FONT_SERIF = "/System/Library/Fonts/Supplemental/Georgia.ttf"
FONT_SANS = "/System/Library/Fonts/Supplemental/Arial.ttf"

def draw_wrapped_text(draw, text, x, y, font, max_width, color, spacing=15):
    words = text.split(' ')
    lines = []
    current_line = []
    
    for word in words:
        current_line.append(word)
        line_text = ' '.join(current_line)
        # get length of line_text
        bbox = draw.textbbox((0, 0), line_text, font=font)
        w = bbox[2] - bbox[0]
        if w > max_width:
            current_line.pop()
            lines.append(' '.join(current_line))
            current_line = [word]
    if current_line:
        lines.append(' '.join(current_line))
        
    current_y = y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        draw.text((x, current_y), line, fill=color, font=font)
        current_y += h + spacing
    return current_y

def create_slide_1():
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Fonts
    font_title = ImageFont.truetype(FONT_SERIF, 64)
    font_subtitle = ImageFont.truetype(FONT_SANS, 36)
    font_body = ImageFont.truetype(FONT_SANS, 48)
    
    # Eyebrow
    draw.text((100, 150), "TIMBRE.AI / INSIGHTS", fill=SAGE_COLOR, font=font_subtitle)
    
    # Title
    title = "The Shift to Agentic\nWeb Infrastructure"
    # Draw title
    y = 280
    for line in title.split('\n'):
        draw.text((100, y), line, fill=GOLD_COLOR, font=font_title)
        y += 85
        
    # Divider line
    draw.line((100, y + 50, 300, y + 50), fill=AMBER_COLOR, width=4)
    
    # Body text
    body = "Client runtimes are no longer just rendering trees for humans. They are stateful, sandboxed execution environments running multi-agent topologies."
    draw_wrapped_text(draw, body, 100, y + 150, font_body, 880, INK_COLOR, spacing=20)
    
    return img

def create_slide_2():
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    font_giant = ImageFont.truetype(FONT_SERIF, 180)
    font_sub = ImageFont.truetype(FONT_SANS, 36)
    font_body = ImageFont.truetype(FONT_SANS, 48)
    
    # Eyebrow
    draw.text((100, 150), "PERFORMANCE BENCHMARKS", fill=SAGE_COLOR, font=font_sub)
    
    # Giant Stat
    draw.text((100, 300), "54.8s", fill=GOLD_COLOR, font=font_giant)
    
    # Subtitle
    draw.text((100, 520), "End-to-end execution at ~2¢ per run.", fill=AMBER_COLOR, font=ImageFont.truetype(FONT_SERIF, 40))
    
    # Divider
    draw.line((100, 620, 300, 620), fill=SAGE_COLOR, width=4)
    
    # Body text
    body = "By pairing Gemini 3.5 Flash with Antigravity 2.0 SDK post_tool_call hooks, we get a 30% reduction in agent loop latency. No database roundtrips, no cold start blockages."
    draw_wrapped_text(draw, body, 100, 700, font_body, 880, INK_COLOR, spacing=20)
    
    return img

def create_slide_3():
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    font_title = ImageFont.truetype(FONT_SERIF, 64)
    font_sub = ImageFont.truetype(FONT_SANS, 36)
    font_body = ImageFont.truetype(FONT_SANS, 48)
    
    # Eyebrow
    draw.text((100, 150), "THE NEXT PARADIGM", fill=SAGE_COLOR, font=font_sub)
    
    # Title
    title = "Build for the\nAgent Stack Today."
    y = 280
    for line in title.split('\n'):
        draw.text((100, y), line, fill=GOLD_COLOR, font=font_title)
        y += 85
        
    # Divider
    draw.line((100, y + 50, 300, y + 50), fill=AMBER_COLOR, width=4)
    
    # Body text
    body = "Timbre compiles research, refactors it into your exact Voice DNA, and audits every stylistic change against verified claims.\n\nYour unique voice. Fact-verified."
    draw_wrapped_text(draw, body, 100, y + 150, font_body, 880, INK_COLOR, spacing=20)
    
    # CTA
    draw.text((100, y + 520), "Visit usetimbre.ai", fill=AMBER_COLOR, font=ImageFont.truetype(FONT_SERIF, 44))
    
    return img

# Ensure directory exists
os.makedirs("code/timbre/data/cache/agentic-web-infra/multiplex/carousel", exist_ok=True)

# Generate and save
create_slide_1().save("code/timbre/data/cache/agentic-web-infra/multiplex/carousel/1.png")
create_slide_2().save("code/timbre/data/cache/agentic-web-infra/multiplex/carousel/2.png")
create_slide_3().save("code/timbre/data/cache/agentic-web-infra/multiplex/carousel/3.png")

print("Carousel slides generated successfully!")

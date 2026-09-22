package dev.worldcombat.core.client;

import com.google.gson.JsonParser;
import com.lowdragmc.lowdraglib2.gui.ui.elements.Label;
import com.lowdragmc.lowdraglib2.gui.ui.data.TextWrap;
import com.lowdragmc.lowdraglib2.gui.ui.event.HoverTooltips;
import com.lowdragmc.lowdraglib2.utils.TextUtilities;
import net.minecraft.client.gui.Font;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.HoverEvent;
import net.minecraft.network.chat.Style;

/** LDLib lays out native Components; Minecraft resolves the style of the exact hovered text run. */
public final class RichTextLabel extends Label {
    public RichTextLabel() { getTextStyle().textWrap(TextWrap.WRAP); }
    public void setDocument(String json) { setText(UiText.component(json)); }
    public void setRuns(String json) { setText(component(json)); }
    public static Component component(String json) {
        var text = Component.empty();
        for (var entry : JsonParser.parseString(json).getAsJsonArray()) {
            var run=entry.getAsJsonObject();
            var part=Component.literal(run.get("text").getAsString());
            var style=Style.EMPTY;
            if(run.has("color")) style=style.withColor(run.get("color").getAsInt() & 0xffffff);
            if(run.has("tooltip") && !run.getAsJsonArray("tooltip").isEmpty()) {
                var tooltip=Component.empty(); boolean first=true;
                for(var line:run.getAsJsonArray("tooltip")) { if(!first)tooltip.append("\n");tooltip.append(Component.literal(line.getAsString()));first=false; }
                style=style.withHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT,tooltip));
            }
            text.append(part.withStyle(style));
        }
        return text;
    }
    /** Matches TextElement's wrapping, font scaling and alignment without maintaining a second text layout. */
    public static Style styleAt(Component text, Font font, float size, float spacing, float width, float height,
                                float x, float y, String horizontal, String vertical) {
        var lines=TextUtilities.computeFormattedLines(font,text,size,width);
        float total=lines.size()*(size+spacing)-spacing;
        if(vertical.equals("CENTER"))y-=(height-total)/2;
        else if(vertical.equals("BOTTOM"))y-=height-total;
        int line=(int)Math.floor(y/(size+spacing));
        if(line<0||line>=lines.size()||y-line*(size+spacing)>=size)return Style.EMPTY;
        var current=lines.get(line);float length=current.getB();
        if(horizontal.equals("CENTER")&&length<=width)x-=(width-length)/2;
        else if(horizontal.equals("RIGHT")&&length<=width)x-=width-length;
        if(x<0||x>=length)return Style.EMPTY;
        var style=font.getSplitter().componentStyleAtWidth(current.getA(),(int)(x/(size/font.lineHeight)));
        return style==null?Style.EMPTY:style;
    }
    @Override public HoverTooltips collectHoverTooltips() {
        var setting=getTextStyle();
        var style=styleAt(TextUtilities.withFont(getText(),setting.font()),getFont(),setting.fontSize(),setting.lineSpacing(),getContentWidth(),getContentHeight(),
            (float)NativeUiHost.mouseX()-getContentX(),(float)NativeUiHost.mouseY()-getContentY(),setting.textAlignHorizontal().name(),setting.textAlignVertical().name());
        var event=style.getHoverEvent();
        if(event!=null) {
            var value=event.getValue(HoverEvent.Action.SHOW_TEXT);
            if(value!=null)return new HoverTooltips(java.util.List.of(value),null,null,null);
        }
        return super.collectHoverTooltips();
    }
}

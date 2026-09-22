package dev.worldcombat.core.client;

import com.google.gson.*;
import net.minecraft.network.chat.*;
import java.util.*;

/** Localized content prose and named numeric arguments share Minecraft's Component formatting. */
public final class UiText {
    private UiText() {}
    public static Component component(String json) { return parse(JsonParser.parseString(json),new JsonObject(),new HashSet<>()); }
    public static String plain(String json) { return component(json).getString(); }
    public static String locale() { return net.minecraft.client.Minecraft.getInstance().getLanguageManager().getSelected(); }
    private static Component parse(JsonElement value,JsonObject bindings,Set<String> resolving) {
        if(value==null||value.isJsonNull())return Component.empty();
        if(value.isJsonPrimitive())return Component.literal(value.getAsJsonPrimitive().isNumber()?value.getAsBigDecimal().stripTrailingZeros().toPlainString():value.getAsString());
        if(value.isJsonArray()) {
            var result=Component.empty();for(var entry:value.getAsJsonArray())result.append(parse(entry,bindings,resolving));return result;
        }
        var object=value.getAsJsonObject();
        if(object.has("paragraphs")) {
            var result=Component.empty();boolean first=true;
            var scope=object.has("bindings")?object.getAsJsonObject("bindings"):bindings;
            for(var paragraph:object.getAsJsonArray("paragraphs")){if(!first)result.append("\n\n");result.append(parse(paragraph,scope,resolving));first=false;}
            return result;
        }
        if(object.has("binding")) {
            var id=object.get("binding").getAsString();
            if(!bindings.has(id)||!resolving.add(id))throw new IllegalArgumentException("Missing or recursive text binding: "+id);
            try{return number(bindings.getAsJsonObject(id),bindings,resolving);}finally{resolving.remove(id);}
        }
        MutableComponent result;
        if(object.has("key")) {
            var key=object.get("key").getAsString();var args=new ArrayList<Object>();
            if(object.has("args"))for(var argument:object.getAsJsonArray("args"))args.add(parse(argument,bindings,resolving));
            var unitText=unitTranslation(object,key,args,bindings);
            result=unitText!=null?unitText:object.has("fallback")?Component.translatableWithFallback(key,object.get("fallback").getAsString(),args.toArray()):Component.translatable(key,args.toArray());
        } else result=parse(object.has("text")?object.get("text"):object.get("value"),bindings,resolving).copy();
        if(object.has("color"))result.withStyle(style->style.withColor(object.get("color").getAsInt()&0xffffff));
        if(object.has("tooltip"))result.withStyle(style->style.withHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT,parseLines(object.getAsJsonArray("tooltip"),bindings,resolving))));
        return result;
    }
    /** Typed numeric bindings supply their units; adjacent prose can already spell the same unit. */
    private static MutableComponent unitTranslation(JsonObject object,String key,List<Object> args,JsonObject bindings) {
        if(!object.has("args"))return null;
        var input=object.getAsJsonArray("args");var kinds=new HashMap<Integer,String>();
        for(int i=0;i<input.size();i++)if(input.get(i).isJsonObject()) {
            var argument=input.get(i).getAsJsonObject();
            var row=argument.has("binding")?bindings.getAsJsonObject(argument.get("binding").getAsString()):null;
            if(row!=null&&row.has("unitKind"))kinds.put(i,row.get("unitKind").getAsString());
        }
        if(kinds.isEmpty())return null;
        String template=net.minecraft.locale.Language.getInstance().getOrDefault(key,object.has("fallback")?object.get("fallback").getAsString():key);
        var matcher=java.util.regex.Pattern.compile("%(?:(\\d+)\\$)?([s%])").matcher(template);
        var result=Component.empty();int cursor=0,ordinary=0;
        while(matcher.find()) {
            if(matcher.start()<cursor)continue;
            result.append(template.substring(cursor,matcher.start()));cursor=matcher.end();
            if(matcher.group(2).equals("%")){result.append("%");continue;}
            int index=matcher.group(1)==null?ordinary++:Integer.parseInt(matcher.group(1))-1;
            if(index<0||index>=args.size()){result.append(matcher.group());continue;}
            result.append((Component)args.get(index));
            String kind=kinds.get(index);
            String pattern="seconds".equals(kind)?"^\\s*(?:秒|刻|seconds?\\b|ticks?\\b|s\\b)":"percent".equals(kind)?"^\\s*(?:%%|%|％|percent\\b)":null;
            if(pattern!=null){var suffix=java.util.regex.Pattern.compile(pattern,java.util.regex.Pattern.CASE_INSENSITIVE).matcher(template.substring(cursor));if(suffix.find())cursor+=suffix.end();}
        }
        return result.append(template.substring(cursor));
    }
    private static Component display(JsonObject row,JsonObject bindings,Set<String> resolving) {
        Component value=row.has("translationKey")?Component.translatableWithFallback(row.get("translationKey").getAsString(),parse(row.get("value"),bindings,resolving).getString()):parse(row.get("value"),bindings,resolving);
        if(row.has("unit"))value=Component.empty().append(value).append(parse(row.get("unit"),bindings,resolving));
        return value;
    }
    private static Component number(JsonObject row,JsonObject bindings,Set<String> resolving) {
        var value=display(row,bindings,resolving).copy();var lines=new ArrayList<Component>();
        if(row.has("label"))lines.add(Component.translatable("worldcombat.ui.value_line",parse(row.get("label"),bindings,resolving),value.copy()));
        explain(row,bindings,resolving,lines,1);
        var tooltip=Component.empty();for(int i=0;i<lines.size();i++){if(i>0)tooltip.append("\n");tooltip.append(lines.get(i));}
        return value.withStyle(style->style.withColor(0xb07818).withUnderlined(true).withHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT,tooltip)));
    }
    private static final int MAX_DEPTH=6;
    /**
     * One hovered number reads as: its line, then "= formula" naming its terms, then each term indented one
     * level with the same treatment. Depth is bounded so a deep tree stays a readable tooltip.
     */
    private static void explain(JsonObject row,JsonObject bindings,Set<String> resolving,List<Component> lines,int depth) {
        var indent="  ".repeat(depth);
        if(row.has("formula"))lines.add(Component.literal(indent).append(Component.translatable("worldcombat.ui.formula_line",formula(row.getAsJsonArray("formula"),bindings,resolving))));
        if(row.has("description")&&!row.get("description").isJsonNull()) {
            var description=row.get("description");
            if(description.isJsonArray())for(var line:description.getAsJsonArray())lines.add(Component.literal(indent).append(parse(line,bindings,resolving)));
            else lines.add(Component.literal(indent).append(parse(description,bindings,resolving)));
        }
        if(depth>MAX_DEPTH||!row.has("contributions"))return;
        for(var entry:row.getAsJsonArray("contributions")) {
            var part=entry.getAsJsonObject();
            lines.add(Component.literal(indent).append(Component.translatable("worldcombat.ui.value_line",parse(part.get("label"),bindings,resolving),display(part,bindings,resolving))));
            explain(part,bindings,resolving,lines,depth+1);
        }
    }
    /** Tokens are term labels (translated) or operator strings; spaces separate them except around brackets. */
    private static Component formula(JsonArray tokens,JsonObject bindings,Set<String> resolving) {
        var result=Component.empty();String previous=null;
        for(var token:tokens) {
            var literal=token.isJsonPrimitive()?token.getAsString():null;
            boolean closing=literal!=null&&(literal.equals(")")||literal.equals(","));
            boolean opening=previous!=null&&previous.endsWith("(");
            if(previous!=null&&!closing&&!opening)result.append(" ");
            result.append(parse(token,bindings,resolving));
            previous=literal!=null?literal:"";
        }
        return result;
    }
    private static Component parseLines(JsonArray lines,JsonObject bindings,Set<String> resolving) {
        var result=Component.empty();for(int i=0;i<lines.size();i++){if(i>0)result.append("\n");result.append(parse(lines.get(i),bindings,resolving));}return result;
    }
}

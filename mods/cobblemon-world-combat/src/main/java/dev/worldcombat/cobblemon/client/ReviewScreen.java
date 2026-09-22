package dev.worldcombat.cobblemon.client;

import com.google.gson.*;
import com.lowdragmc.lowdraglib2.gui.holder.ModularUIScreen;
import com.lowdragmc.lowdraglib2.gui.texture.SDFRectTexture;
import com.lowdragmc.lowdraglib2.gui.ui.UIElement;
import com.lowdragmc.lowdraglib2.gui.ui.elements.*;
import dev.worldcombat.cobblemon.network.*;
import dev.worldcombat.core.client.NativeUiHost;
import net.minecraft.client.*;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.neoforged.neoforge.client.event.*;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.network.PacketDistributor;
import org.lwjgl.glfw.GLFW;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.*;

/** Mouse-first sandbox. Telemetry updates labels; user edits keep their own lifetime and never rebuild on a timer. */
public final class ReviewScreen {
    private static final KeyMapping PANEL = new KeyMapping("key.worldcombat.review.panel", GLFW.GLFW_KEY_F10, "key.categories.worldcombat.review");
    private static JsonObject state = new JsonObject();
    private static String query="", filter="all", type="all", category="all", tab="arena", pick="subject", historyQuery="";
    private static String mode="free", variant="mob", species="", level="50", targetSpecies="blissey", targetLevel="50", mob="minecraft:iron_golem", count="1", targetMoves="tackle", extras="", properties="", playerMode="creative", effect="minecraft:glowing";
    private static boolean active, friendly, settingsLoaded, announcedReady;
    private static int page, captureDelay;
    private static JsonObject captureRequest;
    private static Object connection;
    private static Screen owned;
    private static Label title, counts, status, pageLabel, notice;
    private static final List<Button> rows = new ArrayList<>();
    private static List<JsonObject> filtered = List.of();
    private static final Map<String,LinkedHashMap<String,String>> drafts = new HashMap<>();
    private static final Map<String,JsonObject> pending = new LinkedHashMap<>();
    private static long editedAt;
    private static UIElement historyHost;
    private static int historyWidth;
    private ReviewScreen() {}
    public static void registerKeys(RegisterKeyMappingsEvent event) { event.register(PANEL); }
    private static String tr(String key,Object... args) { return Component.translatable("worldcombat.review."+key,args).getString(); }
    private static String value(JsonObject data,String key) { return data!=null&&data.has(key)&&!data.get(key).isJsonNull()?data.get(key).getAsString():""; }
    private static String or(JsonObject data,String key,String fallback) { String v=value(data,key);return v.isEmpty()?fallback:v; }
    private static boolean enabled() { return state.has("enabled")&&state.get("enabled").getAsBoolean(); }
    private static String move() { return value(state,"cursor"); }
    private static String name(String id) { return id.isEmpty()?tr("choose"):Component.translatable("cobblemon.move."+id).getString(); }
    private static void send(JsonObject request) {
        if(state.has("run")){request.add("expectedRun",state.get("run"));request.addProperty("expectedMove",move());}
        if(Minecraft.getInstance().getConnection()!=null) PacketDistributor.sendToServer(new ReviewAction(request.toString()));
    }
    private static JsonObject request(String op) { var r=new JsonObject();r.addProperty("op",op);return r; }
    private static void action(String op) { send(request(op)); }
    private static void action(String op,String key,String v) { var r=request(op);r.addProperty(key,v);send(r); }
    private static void flush() { var sent=new ArrayList<>(pending.values());pending.clear();sent.forEach(ReviewScreen::send); }
    private static void close() {
        flush();
        if(NativeUiHost.active()) NativeUiHost.close();
        if(Minecraft.getInstance().screen==owned) Minecraft.getInstance().setScreen(null);
    }
    private static LinkedHashMap<String,String> entries() { return drafts.computeIfAbsent(move(),k->new LinkedHashMap<>()); }
    private static void edit(String id,String text,boolean remove) {
        if(move().isEmpty()) return;
        if(remove) entries().remove(id);else entries().put(id,text);
        var r=request("feedback");r.addProperty("move",move());r.addProperty("id",id);r.addProperty("text",text);r.addProperty("delete",remove);r.addProperty("remember",true);
        pending.put(move()+"/"+id,r);editedAt=System.currentTimeMillis();
    }
    private static void addEntry(String text) { edit(UUID.randomUUID().toString(),text,false);show(); }
    private static void mark(String result) { flush();action("mark","status",result); }
    private static void screenshot() {
        flush(); captureRequest=request("mark");captureRequest.addProperty("status","issue");
        captureRequest.addProperty("expectedMove",move());captureRequest.add("expectedRun",state.get("run"));
        close();captureDelay=3;
    }
    public static void open() { action("sync");show(); }
    public static void receive(ReviewState packet) {
        String before=move();var next=JsonParser.parseString(packet.json()).getAsJsonObject();
        boolean patch=next.has("patch")&&next.get("patch").getAsBoolean();
        if(patch) next.entrySet().forEach(e->state.add(e.getKey(),e.getValue()));else state=next;
        if(!patch&&!move().isEmpty()&&!drafts.containsKey(move())) {
            var lines=new LinkedHashMap<String,String>();
            if(state.has("feedback")) for(var e:state.getAsJsonArray("feedback")){var row=e.getAsJsonObject();lines.put(value(row,"id"),value(row,"text"));}
            drafts.put(move(),lines);
        }
        if(!settingsLoaded&&enabled()) {
            mode=or(state,"mode","free");variant=or(state,"variant","mob");species=value(state,"species");level=or(state,"level","50");if(level.equals("0"))level="50";
            var s=state.getAsJsonObject("setup");targetSpecies=or(s,"targetSpecies","blissey");targetLevel=or(s,"targetLevel","50");mob=or(s,"mob","minecraft:iron_golem");count=or(s,"count","1");targetMoves=or(s,"targetMoves","tackle");properties=value(s,"properties");playerMode=or(s,"playerMode","creative");active="true".equals(value(s,"active"));friendly="true".equals(value(s,"friendly"));
            if(state.has("extras")){var list=new ArrayList<String>();state.getAsJsonArray("extras").forEach(e->list.add(e.getAsString()));extras=String.join(",",list);}settingsLoaded=true;
        }
        if(next.has("open")&&next.get("open").getAsBoolean()) { show();return; }
        if(Minecraft.getInstance().screen==owned) { if(!before.equals(move()))show();else refresh(); }
    }
    private static void apply(String id) {
        if(id.isEmpty())return;flush();
        try {
            var r=request("setup");r.addProperty("move",id);r.addProperty("mode",mode);r.addProperty("variant",variant);r.addProperty("species",species);r.addProperty("level",Integer.parseInt(level));r.addProperty("moves",extras);
            r.add("setup",configuration());
            send(r);close();
        }catch(NumberFormatException e){if(notice!=null)notice.setText(Component.literal(tr("numbers")));}
    }
    private static JsonObject configuration() {
        var s=new JsonObject();s.addProperty("targetSpecies",targetSpecies);s.addProperty("targetLevel",Integer.parseInt(targetLevel));s.addProperty("mob",mob);s.addProperty("count",Integer.parseInt(count));s.addProperty("targetMoves",targetMoves);s.addProperty("properties",properties);s.addProperty("active",active);s.addProperty("friendly",friendly);s.addProperty("playerMode",playerMode);return s;
    }
    private static void arena(String operation) {
        try {var r=request("arena");r.addProperty("action",operation);r.addProperty("variant",variant);r.add("setup",configuration());send(r);}
        catch(NumberFormatException e){notice.setText(Component.literal(tr("numbers")));}
    }
    private static <T extends UIElement> T place(T e,int x,int y,int w,int h) { e.lss("position","absolute").lss("left",x).lss("top",y).lss("width",w).lss("height",h);return e; }
    private static Label label(UIElement p,String text,int x,int y,int w) { var e=place(new Label(),x,y,w,15);e.setText(Component.literal(text));e.getTextStyle().textColor(0xFFEBF2F8);p.addChild(e);return e; }
    private static Button button(UIElement p,String text,int x,int y,int w,Runnable click) {
        var e=place(new Button(),x,y,w,21);e.setText(Component.literal(text));e.textStyle(s->s.textColor(0xFFF1F5F9));
        e.getButtonStyle().baseTexture(SDFRectTexture.of(0xFF263B50)).hoverTexture(SDFRectTexture.of(0xFF355570)).pressedTexture(SDFRectTexture.of(0xFF416D8C));e.setOnClick(ev->click.run());p.addChild(e);return e;
    }
    private static TextField field(UIElement p,String v,int x,int y,int w,Consumer<String> change) {var e=place(new TextField(),x,y,w,20);e.setText(v);e.setTextResponder(change);p.addChild(e);return e;}
    private static void select(UIElement p,List<String> values,String v,Function<String,String> text,int x,int y,int w,Consumer<String> change) {
        var e=place(new Selector<String>(),x,y,w,21);
        e.setCandidates(values);e.setSelected(v,false);
        // LDLib rebuilds the selected-value view when its provider changes; an empty selection is valid.
        e.setCandidateUIProvider(selected->{
            var label=new Label();
            label.setText(selected==null?Component.empty():Component.literal(text.apply(selected)));
            label.getTextStyle().textColor(0xFFF1F5F9);return label;
        });
        e.setOnValueChanged(selected->{if(selected!=null)change.accept(selected);});
        p.addChild(e);
    }
    private static UIElement scroll(UIElement p,int x,int y,int w,int h,int contentHeight) {var s=place(new ScrollerView(),x,y,w,h);p.addChild(s);var body=place(new UIElement(),0,0,w-12,contentHeight);s.addScrollViewChild(body);return body;}
    private static void show() {
        int w=Math.min(790,NativeUiHost.width()-12),h=Math.min(432,NativeUiHost.height()-12),lw=Math.min(222,w/3),rx=lw+20,rw=w-rx-12;
        var root=place(new UIElement(),0,0,NativeUiHost.width(),NativeUiHost.height());
        var panel=place(new UIElement(),(NativeUiHost.width()-w)/2,(NativeUiHost.height()-h)/2,w,h);panel.getStyle().backgroundTexture(SDFRectTexture.of(0xF2111E2B));root.addChild(panel);
        label(panel,tr("catalog"),10,8,lw);field(panel,query,10,26,lw,t->{query=t;page=0;refresh();});
        select(panel,List.of("all","pending","issue","ok","noted"),filter,ReviewScreen::tr,10,51,lw/2-2,t->{filter=t;page=0;refresh();});
        select(panel,List.of("all","physical","special","status"),category,s->tr("category."+s),14+lw/2,51,lw/2-4,t->{category=t;page=0;refresh();});
        var types=new ArrayList<String>();types.add("all");for(var e:catalog()){String t=value(e.getAsJsonObject(),"type");if(!types.contains(t))types.add(t);}
        select(panel,types,type,s->s.equals("all")?tr("all-types"):Component.translatable("cobblemon.type."+s).getString(),10,77,lw,t->{type=t;page=0;refresh();});
        select(panel,List.of("subject","extra","enemy"),pick,s->tr("pick."+s),10,103,lw,t->{pick=t;refresh();});
        counts=label(panel,"",10,129,lw);rows.clear();int n=Math.max(2,(h-180)/23);
        for(int i=0;i<n;i++){final int slot=i;rows.add(button(panel,"",10,147+i*23,lw,()->{
            int index=page*rows.size()+slot;if(index>=filtered.size())return;String id=value(filtered.get(index),"id");
            if(pick.equals("subject"))apply(id);else {
                var list=new ArrayList<>(Arrays.stream((pick.equals("extra")?extras:targetMoves).split(",")).map(String::trim).filter(t->!t.isEmpty()).toList());
                if(list.contains(id))list.remove(id);else if(list.size()<(pick.equals("extra")?3:4))list.add(id);
                if(pick.equals("extra"))extras=String.join(",",list);else targetMoves=String.join(",",list);show();
            }
        }));}
        button(panel,"‹",10,h-28,32,()->{page=Math.max(0,page-1);refresh();});pageLabel=label(panel,"",48,h-24,lw-85);button(panel,"›",lw-22,h-28,32,()->{if((page+1)*rows.size()<filtered.size())page++;refresh();});
        title=label(panel,"",rx,8,rw-82);button(panel,tr("resume"),w-88,5,76,ReviewScreen::close);
        status=label(panel,"",rx,27,rw);notice=label(panel,"",rx,45,rw);
        button(panel,tr("arena-tab"),rx,64,rw/2-2,()->{flush();tab="arena";show();});button(panel,tr("feedback-tab"),rx+rw/2+2,64,rw/2-2,()->{flush();tab="feedback";show();});
        if(tab.equals("feedback"))feedbackPanel(panel,rx,91,rw,h-125);else arenaPanel(panel,rx,91,rw,h-125);
        button(panel,tr("pass-stay"),rx,h-28,rw/3-3,()->mark("ok"));button(panel,tr("issue-stay"),rx+rw/3+1,h-28,rw/3-3,()->{mark("issue");tab="feedback";show();});button(panel,tr("replay-stay"),rx+2*rw/3+2,h-28,rw/3-3,()->apply(move()));
        owned=new ModularUIScreen(NativeUiHost.themed(root),Component.literal(tr("title"))){@Override public boolean isPauseScreen(){return false;}@Override public void onClose(){flush();Minecraft.getInstance().setScreen(null);}};
        Minecraft.getInstance().setScreen(owned);refresh();
    }
    private static void arenaPanel(UIElement panel,int x,int y,int width,int height) {
        int quick=(width-8)/3;
        button(panel,tr("quick-mob"),x,y,quick,()->{variant="mob";arena("add-target");});
        button(panel,tr("quick-pokemon"),x+quick+4,y,quick,()->{variant="pokemon";arena("add-target");});
        button(panel,tr("heal"),x+2*(quick+4),y,quick,()->{action("condition","condition","heal");action("restore-player");});
        var p=scroll(panel,x,y+26,width,height-26,710);int w=width-16,half=w/2-2,third=w/3-3;
        label(p,tr("play-as"),0,0,w);select(p,List.of("free","duel","ai"),mode,ReviewScreen::tr,0,17,w,t->mode=t);
        button(p,tr("apply-play"),0,43,half,()->apply(move()));button(p,tr("commands"),half+4,43,half,()->{close();CompanionContentClient.dispatch("command-click");});
        button(p,tr("details"),0,68,half,()->inspect("settings"));button(p,tr("attributes"),half+4,68,half,()->inspect("attributes"));
        label(p,tr("subject-settings"),0,96,w);field(p,species,0,113,half,t->species=t);field(p,level,half+4,113,half,t->level=t);
        label(p,tr("extra-label"),0,138,w);field(p,extras,0,155,w,t->extras=t);
        label(p,tr("native-properties"),0,180,w);field(p,properties,0,197,w,t->properties=t);
        label(p,tr("target-settings"),0,223,w);select(p,List.of("mob","pokemon","player"),variant,ReviewScreen::tr,0,240,half,t->variant=t);
        select(p,List.of("idle","active","friendly"),friendly?"friendly":active?"active":"idle",ReviewScreen::tr,half+4,240,half,t->{friendly=t.equals("friendly");active=t.equals("active");});
        label(p,tr("mob-count"),0,266,w);field(p,mob,0,283,half,t->mob=t);field(p,count,half+4,283,half,t->count=t);
        label(p,tr("pokemon-level"),0,309,w);field(p,targetSpecies,0,326,half,t->targetSpecies=t);field(p,targetLevel,half+4,326,half,t->targetLevel=t);
        label(p,tr("target-loadout"),0,352,w);field(p,targetMoves,0,369,w,t->targetMoves=t);
        button(p,tr("add-target"),0,395,third,()->arena("add-target"));button(p,tr("clear-targets"),third+4,395,third,()->arena("clear-targets"));button(p,tr("apply-play"),2*(third+4),395,third,()->apply(move()));
        button(p,tr("engage"),0,421,half,()->{action("arena","action","engage");close();});button(p,tr("cease"),half+4,421,half,()->action("arena","action","cease"));
        label(p,tr("player-settings"),0,449,w);
        select(p,List.of("creative","survival"),playerMode,ReviewScreen::tr,0,466,third,t->{playerMode=t;action("player-mode","value",t);});
        button(p,tr("kit"),third+4,466,third,()->action("kit"));button(p,tr("restore-player"),2*(third+4),466,third,()->action("restore-player"));
        label(p,tr("conditions"),0,494,w);String[] conditions={"day","night","rain","clear","heal","hurt","clear-effects"};
        for(int i=0;i<conditions.length;i++){String c=conditions[i];button(p,tr(c),(i%3)*(third+4),512+(i/3)*25,third,()->action("condition","condition",c));}
        field(p,effect,0,590,w-90,t->effect=t);button(p,tr("effect"),w-86,590,86,()->action("condition","condition","effect:"+effect));
        String[] terrain={"wall","clear-wall","water","dry"};for(int i=0;i<terrain.length;i++){String a=terrain[i];button(p,tr(a),(i%2)*(half+4),619+(i/2)*25,half,()->action("arena","action",a));}
        label(p,tr("setup-hint"),0,676,w);
    }
    private static void inspect(String key) {if(value(state,"pokemon").isEmpty()){notice.setText(Component.literal(tr("need-companion")));return;}close();CompanionContentClient.dispatch(key,value(state,"pokemon"),move());}
    private static void feedbackPanel(UIElement panel,int x,int y,int w,int h) {
        if(move().isEmpty()){label(panel,tr("choose"),x,y,w);return;}
        int ew=(w*3)/5-4,hw=w-ew-8;
        button(panel,tr("add-entry"),x,y,ew/2-2,()->addEntry(""));button(panel,tr("save-entries"),x+ew/2+2,y,ew/2-2,()->{flush();notice.setText(Component.literal(tr("saved")));});
        button(panel,tr("capture"),x+ew+8,y,hw,ReviewScreen::screenshot);
        var body=scroll(panel,x,y+27,ew,h-27,Math.max(h-27,entries().size()*96+20));int index=0;
        for(var entry:entries().entrySet()) {
            String id=entry.getKey();int at=index++*96;label(body,tr("entry",index),0,at,ew-73);button(body,tr("delete-entry"),ew-75,at,60,()->{edit(id,"",true);flush();show();});
            var area=place(new TextArea(),0,at+24,ew-16,65);area.setLines(Arrays.asList(entry.getValue().split("\n",-1)));area.setLinesResponder(lines->edit(id,String.join("\n",lines),false));body.addChild(area);
        }
        if(entries().isEmpty())label(body,tr("empty-entries"),0,3,ew-18);
        label(panel,tr("history"),x+ew+8,y+30,hw);field(panel,historyQuery,x+ew+8,y+48,hw,t->{historyQuery=t;refreshHistory();});
        historyHost=scroll(panel,x+ew+8,y+75,hw,h-75,Math.max(h-75,(state.has("feedbackLibrary")?state.getAsJsonArray("feedbackLibrary").size():0)*46));historyWidth=hw-16;refreshHistory();
    }
    private static void refreshHistory() {
        if(historyHost==null)return;historyHost.clearAllChildren();var found=new LinkedHashSet<String>();
        var list=state.has("feedbackLibrary")?state.getAsJsonArray("feedbackLibrary"):new JsonArray();int i=0;
        for(int at=list.size()-1;at>=0;at--) {
            var item=list.get(at).getAsJsonObject();String text=value(item,"text");if(text.isBlank()||!text.toLowerCase(Locale.ROOT).contains(historyQuery.toLowerCase(Locale.ROOT))||!found.add(text))continue;
            final String copy=text;String preview=text.replace('\n',' ');if(preview.length()>45)preview=preview.substring(0,45)+"…";
            button(historyHost,preview,0,i*46,historyWidth,()->addEntry(copy));label(historyHost,name(value(item,"move")),0,i*46+23,historyWidth);i++;
        }
        historyHost.lss("height",Math.max(30,i*46));if(i==0)label(historyHost,tr("history-empty"),0,0,historyWidth);
    }
    private static JsonArray catalog() { return state.has("moves")?state.getAsJsonArray("moves"):new JsonArray(); }
    private static void refresh() {
        if(title==null)return;var matches=new ArrayList<JsonObject>();
        for(var e:catalog()) {
            var row=e.getAsJsonObject();String id=value(row,"id"),s=value(row,"status");
            if(!filter.equals("all")&&!(filter.equals("noted")?row.get("feedbackCount").getAsInt()>0:filter.equals(s)))continue;
            if(!type.equals("all")&&!type.equals(value(row,"type")))continue;if(!category.equals("all")&&!category.equals(value(row,"category")))continue;
            if(!(id+" "+name(id)).toLowerCase(Locale.ROOT).contains(query.toLowerCase(Locale.ROOT)))continue;matches.add(row);
        }
        filtered=matches;int size=Math.max(1,rows.size());page=Math.min(page,Math.max(0,(matches.size()-1)/size));
        counts.setText(Component.literal(tr("results",matches.size(),catalog().size())));title.setText(Component.literal(name(move())+(move().isEmpty()?"":" · "+move())));status.setText(Component.literal(summary()));notice.setText(Component.literal(value(state,"message")));
        pageLabel.setText(Component.literal((page+1)+" / "+Math.max(1,(matches.size()+size-1)/size)));
        for(int i=0;i<rows.size();i++){int at=page*rows.size()+i;var row=at<matches.size()?matches.get(at):null;rows.get(i).lss("display",row==null?"none":"flex");if(row!=null){String id=value(row,"id");rows.get(i).setText(Component.literal((id.equals(move())?"▶ ":"")+name(id)+" · "+tr(value(row,"status"))));}}
    }
    private static String summary() {
        var t=state.getAsJsonObject("telemetry");if(t!=null&&value(t,"phase").equals("preparing"))return tr("loading");
        if(t!=null&&t.has("notes")) {var notes=t.getAsJsonArray("notes");if(!notes.isEmpty()){var last=notes.get(notes.size()-1).getAsJsonObject();if(value(last,"kind").equals("fail"))return value(last,"label");}}
        if(value(state,"mode").equals("ai")&&t!=null&&t.has("verdict"))return tr("technical",value(t,"verdict"),value(t.getAsJsonObject("checks"),"expectations"));
        return tr("free-hint");
    }
    private static void hud(RenderGuiEvent.Post event) {
        var mc=Minecraft.getInstance();if(!enabled()||mc.player==null||mc.screen!=null||mc.options.hideGui)return;
        var lines=new ArrayList<String>();lines.add(name(move())+" · "+tr(value(state,"mode")));lines.add(tr("tool-hint"));
        if(value(state,"message").startsWith("未完成"))lines.add(value(state,"message"));
        var telemetry=state.getAsJsonObject("telemetry");if(telemetry!=null&&telemetry.has("notes")){var notes=telemetry.getAsJsonArray("notes");if(!notes.isEmpty()&&value(notes.get(notes.size()-1).getAsJsonObject(),"kind").equals("fail"))lines.add(summary());}
        if(!move().isEmpty())lines.add(tr("input-hint",CompanionInput.binding(CompanionInput.SKILLS[0]),CompanionInput.binding(CompanionContentClient.COMMAND)));
        var data=state.getAsJsonObject("telemetry");if(data!=null&&data.has("actors")){int n=0;for(var e:data.getAsJsonArray("actors")){if(n++>=4)break;var a=e.getAsJsonObject();lines.add(value(a,"name")+"  HP "+Math.round(a.get("health").getAsDouble())+"/"+Math.round(a.get("maxHealth").getAsDouble()));}}
        var g=event.getGuiGraphics();int width=Math.min(370,mc.getWindow().getGuiScaledWidth()-16),height=8;for(var line:lines)height+=mc.font.split(Component.literal(line),width-12).size()*10;g.fill(8,8,8+width,8+height,0xB0121D2B);int y=12;
        for(var line:lines)for(var part:mc.font.split(Component.literal(line),width-12)){g.drawString(mc.font,part,14,y,0xFFE1EFF8,false);y+=10;}
    }
    private static void tick(ClientTickEvent.Post event) {
        var mc=Minecraft.getInstance();var current=mc.getConnection();
        if(current!=connection){connection=current;state=new JsonObject();owned=null;announcedReady=false;settingsLoaded=false;drafts.clear();pending.clear();historyHost=null;captureDelay=0;}
        if(mc.player==null)return;
        if(!announcedReady&&Boolean.getBoolean("worldcombat.review")&&mc.level!=null&&mc.screen==null){announcedReady=true;action("ready");}
        if(!pending.isEmpty()&&System.currentTimeMillis()-editedAt>900)flush();
        if(PANEL.consumeClick()){if(mc.screen==owned)close();else open();}
        if(captureDelay>0&&--captureDelay==0){String file="review-"+move()+"-"+LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss-SSS"))+".png";Screenshot.grab(mc.gameDirectory,file,mc.getMainRenderTarget(),message->{});captureRequest.addProperty("capture","screenshots/"+file);if(mc.getConnection()!=null)PacketDistributor.sendToServer(new ReviewAction(captureRequest.toString()));captureRequest=null;}
    }
    public static void setup() {
        ControlNetwork.reviewReceiver=packet->Minecraft.getInstance().execute(()->receive(packet));
        NeoForge.EVENT_BUS.addListener(ReviewScreen::tick);NeoForge.EVENT_BUS.addListener(ReviewScreen::hud);
        NeoForge.EVENT_BUS.addListener((ScreenEvent.KeyPressed.Pre event)->{if(enabled()&&event.getKeyCode()==PANEL.getKey().getValue()){if(event.getScreen()==owned)close();else{close();open();}while(PANEL.consumeClick()){}event.setCanceled(true);}});
        NeoForge.EVENT_BUS.addListener((RegisterClientCommandsEvent event)->event.getDispatcher().register(net.minecraft.commands.Commands.literal("wcreview").executes(context->{open();return 1;})));
    }
}

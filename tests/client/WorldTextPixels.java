package dev.worldcombat.core.client;

import com.google.gson.*;
import com.mojang.blaze3d.font.GlyphProvider;
import com.mojang.blaze3d.systems.RenderSystem;
import com.mojang.blaze3d.vertex.VertexConsumer;
import com.mojang.serialization.JsonOps;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.font.FontSet;
import net.minecraft.client.gui.font.FontOption;
import net.minecraft.client.gui.font.providers.GlyphProviderDefinition;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.texture.TextureManager;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.*;
import net.minecraft.world.phys.Vec3;
import org.joml.*;
import org.lwjgl.glfw.GLFW;
import org.lwjgl.opengl.GL;
import org.lwjgl.system.MemoryUtil;
import static org.lwjgl.opengl.GL33C.*;
import java.io.*;
import java.nio.*;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;

/** Real Minecraft glyph providers/Font/baked atlas and font shaders in an invisible offscreen GL context. */
public final class WorldTextPixels {
    static Path assets,output;static JsonObject assetIndex;static TextureManager textures;
    static final int WIDTH=640,HEIGHT=400;
    static InputStream resource(ResourceLocation id)throws IOException {
        String name=id.getNamespace()+"/"+id.getPath();
        if(assetIndex.has(name)) {String address=assetIndex.getAsJsonObject(name).get("hash").getAsString();return Files.newInputStream(assets.resolve("objects").resolve(address.substring(0,2)).resolve(address));}
        var stream=WorldTextPixels.class.getClassLoader().getResourceAsStream("assets/"+name);if(stream==null)throw new FileNotFoundException(name);return stream;
    }
    static Resource resourceFile(ResourceLocation id){return new Resource(null,()->resource(id));}
    static ResourceManager resources(){return (ResourceManager)java.lang.reflect.Proxy.newProxyInstance(WorldTextPixels.class.getClassLoader(),new Class[]{ResourceManager.class},(proxy,method,args)->switch(method.getName()){
        case "getResource"->Optional.of(resourceFile((ResourceLocation)args[0]));case "getResourceOrThrow"->resourceFile((ResourceLocation)args[0]);case "open"->resource((ResourceLocation)args[0]);case "openAsReader"->new BufferedReader(new InputStreamReader(resource((ResourceLocation)args[0]),java.nio.charset.StandardCharsets.UTF_8));case "getResourceStack"->List.of(resourceFile((ResourceLocation)args[0]));case "getNamespaces"->Set.of("minecraft");case "listPacks"->java.util.stream.Stream.empty();case "listResources","listResourceStacks"->Map.of();case "toString"->"Locked Minecraft font resources";default->throw new UnsupportedOperationException(method.toString());});}
    static JsonObject json(ResourceLocation id)throws IOException{try(var reader=new InputStreamReader(resource(id),java.nio.charset.StandardCharsets.UTF_8)){return JsonParser.parseReader(reader).getAsJsonObject();}}
    static List<GlyphProvider.Conditional> providers(ResourceManager manager)throws Exception{
        var providers=new ArrayList<GlyphProvider.Conditional>();
        for(String source:List.of("font/include/space.json","font/include/default.json","font/include/unifont.json")) for(var entry:json(ResourceLocation.withDefaultNamespace(source)).getAsJsonArray("providers")){
            var value=entry.getAsJsonObject();String type=value.get("type").getAsString();
            if(!type.equals("space")&&!type.equals("unihex")&&!(type.equals("bitmap")&&value.get("file").getAsString().endsWith("font/ascii.png")))continue;
            var definition=GlyphProviderDefinition.MAP_CODEC.codec().parse(JsonOps.INSTANCE,value).getOrThrow();
            providers.add(new GlyphProvider.Conditional(definition.unpack().left().orElseThrow().load(manager),value.has("filter")?FontOption.Filter.CODEC.parse(JsonOps.INSTANCE,value.get("filter")).getOrThrow():FontOption.Filter.ALWAYS_PASS));
        }
        if(providers.size()<2)throw new AssertionError("Native ASCII and Chinese font providers were not loaded");return providers;
    }
    static Object field(Object value,String name)throws Exception{for(Class<?>type=value.getClass();type!=null;type=type.getSuperclass())try{var field=type.getDeclaredField(name);field.setAccessible(true);return field.get(value);}catch(NoSuchFieldException ignored){}throw new NoSuchFieldException(name);}
    static ResourceLocation atlas(RenderType type)throws Exception{return (ResourceLocation)((Optional<?>)field(field(field(type,"state"),"textureState"),"texture")).orElseThrow();}
    static final class Vertices implements VertexConsumer {
        final List<float[]> vertices=new ArrayList<>();float[] current;
        public VertexConsumer addVertex(float x,float y,float z){current=new float[]{x,y,z,1,1,1,1,0,0};vertices.add(current);return this;}
        public VertexConsumer setColor(int r,int g,int b,int a){current[3]=r/255f;current[4]=g/255f;current[5]=b/255f;current[6]=a/255f;return this;}
        public VertexConsumer setUv(float u,float v){current[7]=u;current[8]=v;return this;}
        public VertexConsumer setUv1(int u,int v){return this;}public VertexConsumer setUv2(int u,int v){return this;}public VertexConsumer setNormal(float x,float y,float z){return this;}
        float[] triangles(){if(vertices.size()%4!=0)throw new AssertionError("Font did not emit quads");float[] values=new float[vertices.size()/4*6*9];int at=0;for(int first=0;first<vertices.size();first+=4)for(int corner:new int[]{0,1,2,2,3,0}){System.arraycopy(vertices.get(first+corner),0,values,at,9);at+=9;}return values;}
    }
    static String source(String path)throws IOException{try(var stream=resource(ResourceLocation.withDefaultNamespace(path))){return new String(stream.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);}}
    static String includes(String value)throws IOException{
        var matcher=Pattern.compile("#moj_import\\s+<([^>]+)>").matcher(value);var result=new StringBuffer();
        while(matcher.find())matcher.appendReplacement(result,Matcher.quoteReplacement(includes(source("shaders/include/"+matcher.group(1))).replaceAll("(?m)^#version[^\\n]*", "")));matcher.appendTail(result);return result.toString();
    }
    static int shader(int kind,String source){int id=glCreateShader(kind);glShaderSource(id,source);glCompileShader(id);if(glGetShaderi(id,GL_COMPILE_STATUS)==0)throw new AssertionError(glGetShaderInfoLog(id));return id;}
    static int program(String name)throws IOException{int p=glCreateProgram(),v=shader(GL_VERTEX_SHADER,includes(source("shaders/core/"+name+".vsh"))),f=shader(GL_FRAGMENT_SHADER,includes(source("shaders/core/"+name+".fsh")));glAttachShader(p,v);glAttachShader(p,f);glLinkProgram(p);if(glGetProgrami(p,GL_LINK_STATUS)==0)throw new AssertionError(glGetProgramInfoLog(p));glDeleteShader(v);glDeleteShader(f);return p;}
    static void matrix(int p,String name,Matrix4f value){int at=glGetUniformLocation(p,name);if(at>=0)glUniformMatrix4fv(at,false,value.get(new float[16]));}
    static final Map<String,Integer> programs=new HashMap<>();
    static byte[] draw(Font font,String text,float yaw,float pitch,boolean broken,boolean behind)throws Exception{
        var rotation=new Quaternionf().rotationYXZ((float)java.lang.Math.toRadians(180-yaw),(float)java.lang.Math.toRadians(-pitch),0);
        var offset=rotation.transform(new Vector3f(0,0,behind?4:-4));var point=new Vec3(10,70,-18);var camera=point.subtract(offset.x,offset.y,offset.z);
        var pose=ClientFrame.billboardPose(new Matrix4f(),camera,point,rotation,.034f);if(broken)pose.scale(-1,1,1);
        var groups=new LinkedHashMap<RenderType,Vertices>();font.drawInBatch(text,-font.width(text)/2f,-4,0xffffed96,true,pose,type->groups.computeIfAbsent(type,key->new Vertices()),Font.DisplayMode.NORMAL,0,15728880);
        if(groups.isEmpty())throw new AssertionError("Font produced no native glyph vertices");
        glClearColor(0,0,0,0);glClear(GL_COLOR_BUFFER_BIT|GL_DEPTH_BUFFER_BIT);glEnable(GL_CULL_FACE);glCullFace(GL_BACK);glFrontFace(GL_CCW);glEnable(GL_DEPTH_TEST);glDepthFunc(GL_LEQUAL);glEnable(GL_BLEND);glBlendFunc(GL_SRC_ALPHA,GL_ONE_MINUS_SRC_ALPHA);
        for(var entry:groups.entrySet()){
            String name=entry.getKey().toString().startsWith("text_intensity")?"rendertype_text_intensity":"rendertype_text";
            int p=programs.computeIfAbsent(name,key->{try{return program(key);}catch(IOException e){throw new RuntimeException(e);}});glUseProgram(p);
            matrix(p,"ModelViewMat",new Matrix4f().rotation(rotation.conjugate(new Quaternionf())));matrix(p,"ProjMat",new Matrix4f().perspective((float)java.lang.Math.toRadians(70),WIDTH/(float)HEIGHT,.05f,128));
            glUniform4f(glGetUniformLocation(p,"ColorModulator"),1,1,1,1);glUniform1f(glGetUniformLocation(p,"FogStart"),64);glUniform1f(glGetUniformLocation(p,"FogEnd"),128);glUniform4f(glGetUniformLocation(p,"FogColor"),0,0,0,0);glUniform1i(glGetUniformLocation(p,"FogShape"),0);
            glUniform1i(glGetUniformLocation(p,"Sampler0"),0);glUniform1i(glGetUniformLocation(p,"Sampler2"),2);glActiveTexture(GL_TEXTURE0);glBindTexture(GL_TEXTURE_2D,textures.getTexture(atlas(entry.getKey())).getId());
            float[] vertices=entry.getValue().triangles();int vbo=glGenBuffers();glBindBuffer(GL_ARRAY_BUFFER,vbo);glBufferData(GL_ARRAY_BUFFER,vertices,GL_STREAM_DRAW);
            int[] lengths={3,4,2},offsets={0,12,28};String[] attrs={"Position","Color","UV0"};for(int i=0;i<attrs.length;i++){int at=glGetAttribLocation(p,attrs[i]);glEnableVertexAttribArray(at);glVertexAttribPointer(at,lengths[i],GL_FLOAT,false,36,offsets[i]);}
            int light=glGetAttribLocation(p,"UV2");if(light>=0){glDisableVertexAttribArray(light);glVertexAttribI2i(light,240,240);}glDrawArrays(GL_TRIANGLES,0,vertices.length/9);glDeleteBuffers(vbo);
        }
        glFinish();var bytes=MemoryUtil.memAlloc(WIDTH*HEIGHT*4);glReadPixels(0,0,WIDTH,HEIGHT,GL_RGBA,GL_UNSIGNED_BYTE,bytes);byte[] result=new byte[bytes.remaining()];bytes.get(result);MemoryUtil.memFree(bytes);return result;
    }
    static int coverage(byte[] pixels){int count=0;for(int i=3;i<pixels.length;i+=4)if((pixels[i]&255)>10)count++;return count;}
    static void save(byte[] pixels,String name)throws IOException{var image=new BufferedImage(WIDTH,HEIGHT,BufferedImage.TYPE_INT_ARGB);for(int y=0;y<HEIGHT;y++)for(int x=0;x<WIDTH;x++){int i=(y*WIDTH+x)*4;image.setRGB(x,HEIGHT-1-y,(pixels[i+3]&255)<<24|(pixels[i]&255)<<16|(pixels[i+1]&255)<<8|pixels[i+2]&255);}ImageIO.write(image,"png",output.resolve(name+".png").toFile());}
    public static void main(String[] args)throws Exception{
        assets=Path.of(args[0]);output=Path.of(args[1]);Files.createDirectories(output);assetIndex=JsonParser.parseString(Files.readString(assets.resolve("indexes/17.json"))).getAsJsonObject().getAsJsonObject("objects");
        if(!GLFW.glfwInit())throw new AssertionError("GLFW unavailable");GLFW.glfwDefaultWindowHints();GLFW.glfwWindowHint(GLFW.GLFW_VISIBLE,GLFW.GLFW_FALSE);GLFW.glfwWindowHint(GLFW.GLFW_FOCUSED,GLFW.GLFW_FALSE);GLFW.glfwWindowHint(GLFW.GLFW_CONTEXT_VERSION_MAJOR,3);GLFW.glfwWindowHint(GLFW.GLFW_CONTEXT_VERSION_MINOR,3);GLFW.glfwWindowHint(GLFW.GLFW_OPENGL_PROFILE,GLFW.GLFW_OPENGL_CORE_PROFILE);
        long window=GLFW.glfwCreateWindow(WIDTH,HEIGHT,"Invisible world font check",0,0);if(window==0)throw new AssertionError("Invisible GL context unavailable");
        try{
            GLFW.glfwMakeContextCurrent(window);GL.createCapabilities();RenderSystem.initRenderThread();net.minecraft.SharedConstants.tryDetectVersion();net.neoforged.fml.loading.FMLPaths.loadAbsolutePaths(output);net.neoforged.fml.ModList.of(List.of(),List.of());net.neoforged.fml.loading.LoadingModList.of(List.of(),List.of(),List.of(),List.of(),Map.of());net.minecraft.server.Bootstrap.bootStrap();
            var allocator=ClientFrame.class.getDeclaredMethod("surfaceBuffers");allocator.setAccessible(true);var firstBuffer=allocator.invoke(null);if(firstBuffer!=allocator.invoke(null))throw new AssertionError("World surfaces allocate a buffer for each card");ClientFrame.resetBuffers();if(firstBuffer==allocator.invoke(null))throw new AssertionError("World surface buffer survived reset");ClientFrame.resetBuffers();
            var resources=resources();textures=new TextureManager(resources);var set=new FontSet(textures,ResourceLocation.fromNamespaceAndPath("worldcombat_check","font"));var providers=providers(resources);set.reload(providers,Set.of());var font=new Font(id->set,false);
            String text="Critical 24 · 暴击 +恢复";for(int code:text.codePoints().toArray()){if(code!=' '&&providers.stream().noneMatch(provider->provider.provider().getGlyph(code)!=null))throw new AssertionError("Missing native glyph "+code);set.getGlyph(code);}
            int vao=glGenVertexArrays();glBindVertexArray(vao);int fbo=glGenFramebuffers();glBindFramebuffer(GL_FRAMEBUFFER,fbo);int color=glGenTextures();glBindTexture(GL_TEXTURE_2D,color);glTexImage2D(GL_TEXTURE_2D,0,GL_RGBA8,WIDTH,HEIGHT,0,GL_RGBA,GL_UNSIGNED_BYTE,(ByteBuffer)null);glFramebufferTexture2D(GL_FRAMEBUFFER,GL_COLOR_ATTACHMENT0,GL_TEXTURE_2D,color,0);int depth=glGenRenderbuffers();glBindRenderbuffer(GL_RENDERBUFFER,depth);glRenderbufferStorage(GL_RENDERBUFFER,GL_DEPTH_COMPONENT24,WIDTH,HEIGHT);glFramebufferRenderbuffer(GL_FRAMEBUFFER,GL_DEPTH_ATTACHMENT,GL_RENDERBUFFER,depth);if(glCheckFramebufferStatus(GL_FRAMEBUFFER)!=GL_FRAMEBUFFER_COMPLETE)throw new AssertionError("FBO incomplete");glViewport(0,0,WIDTH,HEIGHT);
            int light=glGenTextures();glActiveTexture(GL_TEXTURE2);glBindTexture(GL_TEXTURE_2D,light);glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_NEAREST);glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_NEAREST);var white=MemoryUtil.memAlloc(16*16*4);while(white.hasRemaining())white.put((byte)255);white.flip();glTexImage2D(GL_TEXTURE_2D,0,GL_RGBA8,16,16,0,GL_RGBA,GL_UNSIGNED_BYTE,white);MemoryUtil.memFree(white);glActiveTexture(GL_TEXTURE0);
            int minimum=Integer.MAX_VALUE;for(float yaw:new float[]{-165,-90,0,75,160})for(float pitch:new float[]{-35,0,42}){
                var broken=draw(font,text,yaw,pitch,true,false);var fixed=draw(font,text,yaw,pitch,false,false);int old=coverage(broken),now=coverage(fixed);if(old!=0)throw new AssertionError("Old mirrored basis was not culled: "+old);if(now<120)throw new AssertionError("Fixed native glyph pixels missing: "+now);minimum=java.lang.Math.min(minimum,now);
                if(yaw==0&&pitch==0){save(broken,"world-text-before");save(fixed,"world-text-after");}
            }
            if(coverage(draw(font,text,0,0,false,true))!=0)throw new AssertionError("Text behind the camera rendered");
            System.out.println("PASS native world font FBO: 15 camera yaw/pitch pairs; old mirrored basis 0 pixels; corrected basis minimum "+minimum+" pixels; native ASCII/Chinese glyphs and text shaders; behind-camera clipping");
            set.close();for(var texture:((Map<?,net.minecraft.client.renderer.texture.AbstractTexture>)field(textures,"byPath")).values()){texture.close();texture.releaseId();}
        }finally{GLFW.glfwDestroyWindow(window);GLFW.glfwTerminate();}
    }
}

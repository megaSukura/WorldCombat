package dev.worldcombat.core.client;

import com.mojang.blaze3d.systems.RenderSystem;
import com.mojang.blaze3d.vertex.ByteBufferBuilder;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import com.mojang.blaze3d.vertex.VertexFormatElement;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.LivingEntity;
import java.util.HashMap;
import java.util.Map;

/** Redraws a loaded native model in a draw-only pose. No client/server entity clone or body mutation. */
public final class NativeEntityEcho {
    private NativeEntityEcho() {}
    private static final ThreadLocal<Boolean> DRAWING=ThreadLocal.withInitial(()->false);
    private record Batch(RenderType original,int uniformTint) {}
    private static final Map<Batch,RenderType> types=new HashMap<>();
    private static ByteBufferBuilder memory;
    private static MultiBufferSource.BufferSource buffers;
    public static boolean active(){return DRAWING.get();}
    public static final class Scope implements AutoCloseable {
        private final boolean previous;
        private Scope(){previous=active();DRAWING.set(true);}
        @Override public void close(){if(previous)DRAWING.set(true);else DRAWING.remove();}
    }
    public static Scope scope(){return new Scope();}
    public static void reset(){if(memory!=null)memory.close();memory=null;buffers=null;types.clear();}
    private static MultiBufferSource.BufferSource buffers(){
        if(buffers==null){memory=new ByteBufferBuilder(16384);buffers=MultiBufferSource.immediate(memory);}
        return buffers;
    }
    public static boolean render(LivingEntity entity,float partial,PoseStack pose,int argb,int light){
        if(active()||(argb>>>24)==0)return false;
        try(var ignored=scope()){
            var source=buffers();
            MultiBufferSource tinted=type->{
                boolean vertexColour=type.format().contains(VertexFormatElement.COLOR);
                var key=new Batch(type,vertexColour?-1:argb);
                var echo=types.computeIfAbsent(key,value->new EchoType(value.original,value.uniformTint));
                return new Tint(source.getBuffer(echo),vertexColour?argb:-1);
            };
            var renderer=Minecraft.getInstance().getEntityRenderDispatcher().getRenderer(entity);
            var offset=renderer.getRenderOffset(entity,partial);
            pose.translate(offset.x,offset.y,offset.z);
            renderer.render(entity,Mth.rotLerp(partial,entity.yRotO,entity.getYRot()),partial,pose,tinted,light);
            return true;
        }catch(RuntimeException|Error failure){reset();throw failure;}
        finally{restore();}
    }
    /** Private batches avoid flushing the level renderer's pending entity/translucent geometry. */
    public static void endFrame(){
        if(types.isEmpty())return;
        try{if(buffers!=null)buffers.endBatch();}
        catch(RuntimeException|Error failure){reset();throw failure;}
        finally{types.clear();restore();}
    }
    private static void restore(){
        RenderSystem.setShaderColor(1,1,1,1);RenderSystem.enableDepthTest();RenderSystem.depthMask(true);RenderSystem.enableCull();RenderSystem.disableBlend();
    }
    private static final class EchoType extends RenderType {
        EchoType(RenderType nativeType,int argb){
            super("world_combat:entity_echo/"+nativeType,nativeType.format(),nativeType.mode(),nativeType.bufferSize(),false,nativeType.mode()==com.mojang.blaze3d.vertex.VertexFormat.Mode.QUADS,
                ()->{nativeType.setupRenderState();RenderSystem.enableDepthTest();RenderSystem.enableBlend();RenderSystem.defaultBlendFunc();RenderSystem.depthMask(false);
                    RenderSystem.setShaderColor((argb>>16&255)/255f,(argb>>8&255)/255f,(argb&255)/255f,(argb>>>24)/255f);},
                ()->{try{nativeType.clearRenderState();}finally{restore();}});
        }
    }
    private record Tint(VertexConsumer delegate,int argb) implements VertexConsumer {
        @Override public VertexConsumer addVertex(float x,float y,float z){delegate.addVertex(x,y,z);return this;}
        @Override public VertexConsumer setColor(int r,int g,int b,int a){
            delegate.setColor(EntityEchoMath.component(r,argb>>16&255),EntityEchoMath.component(g,argb>>8&255),
                EntityEchoMath.component(b,argb&255),EntityEchoMath.component(a,argb>>>24));return this;
        }
        @Override public VertexConsumer setUv(float u,float v){delegate.setUv(u,v);return this;}
        @Override public VertexConsumer setUv1(int u,int v){delegate.setUv1(u,v);return this;}
        @Override public VertexConsumer setUv2(int u,int v){delegate.setUv2(u,v);return this;}
        @Override public VertexConsumer setNormal(float x,float y,float z){delegate.setNormal(x,y,z);return this;}
    }
}

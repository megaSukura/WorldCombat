package dev.worldcombat.core.client;

import com.mojang.blaze3d.vertex.PoseStack;
import org.joml.Matrix4f;
import org.joml.Vector3f;

/** Pure geometry/colour/lifetime checks. Does not claim a rendered GPU image or native model visual approval. */
public final class EntityEchoChecks {
    private static void require(boolean value,String reason){if(!value)throw new AssertionError(reason);}
    public static void main(String[] args){
        var base=new PoseStack();base.translate(3,4,5);var original=new Matrix4f(base.last().pose());
        var echo=EntityEchoMath.pose(base,10,2,-4,2,3,4,90);
        var feet=echo.last().pose().transformPosition(new Vector3f());
        var top=echo.last().pose().transformPosition(new Vector3f(0,1,0));
        var forward=echo.last().pose().transformPosition(new Vector3f(0,0,1));
        require(feet.distance(new Vector3f(13,6,1))<1e-5,"Echo did not use independent feet position");
        require(top.distance(new Vector3f(13,9,1))<1e-5,"Echo did not use independent native body height");
        require(forward.distance(new Vector3f(17,6,1))<1e-5,"Echo yaw or independent width scale was lost");
        require(base.last().pose().equals(original),"Echo mutated the surrounding scene matrix");
        require(EntityEchoMath.component(200,128)==100&&EntityEchoMath.component(255,0)==0&&EntityEchoMath.component(80,255)==80,"Native vertex colour was not multiplied by authored tint/alpha");
        require(EntityEchoMath.scale(.25,2,4)&&!EntityEchoMath.scale(0,1,1)&&!EntityEchoMath.scale(Double.NaN,1,1)
            &&!EntityEchoMath.scale(Double.MAX_VALUE,1,1),"Echo accepted invalid native float geometry");
        require(!NativeEntityEcho.active(),"Echo scope was already active");
        try(var first=NativeEntityEcho.scope()){
            require(NativeEntityEcho.active(),"Echo scope did not open");
            try(var second=NativeEntityEcho.scope()){require(NativeEntityEcho.active(),"Nested echo scope lost its context");}
            require(NativeEntityEcho.active(),"Nested scope closed its parent");
            throw new IllegalStateException("fixture echo renderer failure");
        }catch(IllegalStateException expected){require(!NativeEntityEcho.active(),"Failed native rendering leaked echo state");}
        System.out.println("EntityEchoChecks PASS: independent native pose, source matrix preservation, tint/alpha, float geometry and exception-safe scope");
    }
}

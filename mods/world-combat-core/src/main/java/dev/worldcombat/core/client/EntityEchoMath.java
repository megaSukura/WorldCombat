package dev.worldcombat.core.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.math.Axis;

/** Pure transform/colour operations shared by native entity echoes and their headless checks. */
public final class EntityEchoMath {
    private EntityEchoMath() {}
    public static int component(int nativeValue,int tint){return Math.round(nativeValue*tint/255f);}
    public static boolean scale(double x,double y,double z){return finiteScale(x)&&finiteScale(y)&&finiteScale(z);}
    private static boolean finiteScale(double value){return Double.isFinite(value)&&value>0&&value<=Float.MAX_VALUE&&Float.isFinite(1/(float)value);}
    public static PoseStack pose(PoseStack base,double x,double y,double z,double sx,double sy,double sz,double yaw){
        var result=new PoseStack();result.last().pose().set(base.last().pose());result.last().normal().set(base.last().normal());
        result.translate(x,y,z);result.mulPose(Axis.YP.rotationDegrees((float)yaw));result.scale((float)sx,(float)sy,(float)sz);
        return result;
    }
}

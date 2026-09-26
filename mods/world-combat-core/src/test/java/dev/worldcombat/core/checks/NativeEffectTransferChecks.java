package dev.worldcombat.core.checks;

import dev.worldcombat.core.world.*;
import dev.worldcombat.core.mixin.NativeEffectStackAccess;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.effect.*;
import net.minecraft.world.entity.*;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.living.MobEffectEvent;
import java.util.UUID;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Native transfer is a conditional move, including native cancellation and hidden effect stacks. */
public final class NativeEffectTransferChecks {
    private static UUID fromId, toId;
    private static String mode = "";
    private static int removed, applicable, added;
    private static LivingEntity source;
    private static boolean installed;
    private static void install() {
        if(installed) return; installed=true;
        NeoForge.EVENT_BUS.addListener((MobEffectEvent.Remove event) -> {
            if(!event.getEntity().getUUID().equals(fromId)) return;
            removed++;
            if(mode.equals("remove-veto")) event.setCanceled(true);
        });
        NeoForge.EVENT_BUS.addListener((MobEffectEvent.Applicable event) -> {
            if(!event.getEntity().getUUID().equals(toId)) return;
            applicable++;
            require(event.getEffectSource()==source,"Effect transfer invented its native operator");
            if(mode.equals("apply-veto")) event.setResult(MobEffectEvent.Applicable.Result.DO_NOT_APPLY);
            if(mode.equals("source-change")) source.getEffect(MobEffects.MOVEMENT_SPEED).update(new MobEffectInstance(MobEffects.MOVEMENT_SPEED,900,3));
            if(mode.equals("source-left")) source.discard();
            if(mode.equals("target-change")) {mode="";event.getEntity().addEffect(new MobEffectInstance(MobEffects.POISON,100),source);}
        });
        NeoForge.EVENT_BUS.addListener((MobEffectEvent.Added event) -> {
            if(event.getEntity().getUUID().equals(toId)) added++;
        });
    }
    public static void run(MinecraftCombat combat, ServerLevel level) {
        install(); var from=mob(EntityType.COW,level,2); var to=mob(EntityType.COW,level,8);
        var fromActor=combat.bind(from);var toActor=combat.bind(to);
        try {
            var baseFrom=from.getAttributeValue(Attributes.MOVEMENT_SPEED);var baseTo=to.getAttributeValue(Attributes.MOVEMENT_SPEED);
            var original=new MobEffectInstance(MobEffects.MOVEMENT_SPEED,180,1,false,false,true);
            from.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED,500,0)); from.addEffect(original);
            original=from.getEffect(MobEffects.MOVEMENT_SPEED);
            var snapshot=MinecraftEffectState.capture(from,original).key();
            fromId=from.getUUID();toId=to.getUUID();source=from;removed=applicable=added=0;
            mode="remove-veto";
            require(!combat.transferMobEffect(fromActor,fromActor,toActor,"minecraft:speed",snapshot,null)
                && from.getEffect(MobEffects.MOVEMENT_SPEED)==original&&!to.hasEffect(MobEffects.MOVEMENT_SPEED)
                &&removed==1&&applicable==0&&added==0,"Removal veto copied a native effect");
            mode="apply-veto";
            require(!combat.transferMobEffect(fromActor,fromActor,toActor,"minecraft:speed",snapshot,null)
                &&from.getEffect(MobEffects.MOVEMENT_SPEED)==original&&!to.hasEffect(MobEffects.MOVEMENT_SPEED)
                &&removed==2&&applicable==1&&added==0,"Application veto consumed original effect");
            mode="";
            require(!combat.transferMobEffect(fromActor,fromActor,toActor,"minecraft:speed",snapshot+"stale",null)
                &&removed==2,"Stale effect owner dispatched callbacks");
            require(combat.transferMobEffect(fromActor,fromActor,toActor,"minecraft:speed",snapshot,null),"Valid native effect transfer refused");
            var moved=to.getEffect(MobEffects.MOVEMENT_SPEED);
            require(!from.hasEffect(MobEffects.MOVEMENT_SPEED)&&moved!=null&&moved.getDuration()==180&&moved.getAmplifier()==1
                &&removed==3&&applicable==2&&added==1,"Transfer did not move exact native state once");
            var hidden=((NativeEffectStackAccess)moved).worldcombat$hidden();
            require(hidden!=null&&hidden.getDuration()==500&&hidden.getAmplifier()==0
                &&moved.getCures().equals(original.getCures()),"Transfer lost native hidden stack or cure metadata");
            require(Math.abs(from.getAttributeValue(Attributes.MOVEMENT_SPEED)-baseFrom)<1e-7
                &&to.getAttributeValue(Attributes.MOVEMENT_SPEED)>baseTo,"Transfer did not move native attribute modifiers");
            fromId=toId=null;
            from.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED,80,0));
            snapshot=MinecraftEffectState.capture(from,from.getEffect(MobEffects.MOVEMENT_SPEED)).key();
            require(!combat.transferMobEffect(fromActor,fromActor,toActor,"minecraft:speed",snapshot,null)
                &&from.hasEffect(MobEffects.MOVEMENT_SPEED),"Stronger destination consumed a weaker original");
            to.removeAllEffects();from.removeAllEffects();
            to.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED,600,0));
            from.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED,450,1));
            from.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED,100,2));
            snapshot=MinecraftEffectState.capture(from,from.getEffect(MobEffects.MOVEMENT_SPEED)).key();
            require(combat.transferMobEffect(fromActor,fromActor,toActor,"minecraft:speed",snapshot,null),"Merge into weaker native effect refused");
            moved=to.getEffect(MobEffects.MOVEMENT_SPEED);hidden=((NativeEffectStackAccess)moved).worldcombat$hidden();
            require(moved.getAmplifier()==2&&moved.getDuration()==100&&hidden!=null&&hidden.getAmplifier()==1&&hidden.getDuration()==450
                &&((NativeEffectStackAccess)hidden).worldcombat$hidden()!=null
                &&((NativeEffectStackAccess)hidden).worldcombat$hidden().getDuration()==600,"Native merge dropped one side's hidden state");
            // A rejected refresh must retain the complete old stack; an accepted exact replacement intentionally discards it.
            fromId=toId=to.getUUID();source=from;mode="remove-veto";
            var key=MinecraftEffectState.capture(to,moved).key();
            require(!combat.replaceMobEffect(fromActor,toActor,"minecraft:speed",key,35,0,null)&&to.getEffect(MobEffects.MOVEMENT_SPEED)==moved,"Replacement removal refusal erased old stack");
            mode="apply-veto";
            require(!combat.replaceMobEffect(fromActor,toActor,"minecraft:speed",key,35,0,null)&&to.getEffect(MobEffects.MOVEMENT_SPEED)==moved,"Replacement application refusal erased old stack");
            mode="";
            require(combat.replaceMobEffect(fromActor,toActor,"minecraft:speed",key,35,0,null)
                &&to.getEffect(MobEffects.MOVEMENT_SPEED).getAmplifier()==0&&to.getEffect(MobEffects.MOVEMENT_SPEED).getDuration()==35
                &&((NativeEffectStackAccess)to.getEffect(MobEffects.MOVEMENT_SPEED)).worldcombat$hidden()==null,"Exact lower-strength replacement retained the old hidden stack");
            require(!combat.replaceMobEffect(fromActor,toActor,"minecraft:speed",key,200,2,null),"Stale replacement accepted retired native ownership");
            require(combat.replaceMobEffect(fromActor,toActor,"minecraft:glowing","",20,0,null),"Absent-state conditional application failed");
            fromId=toId=null;
            from.removeAllEffects();to.removeAllEffects();from.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED,90,0));
            snapshot=MinecraftEffectState.capture(from,from.getEffect(MobEffects.MOVEMENT_SPEED)).key();
            fromId=from.getUUID();toId=to.getUUID();mode="source-change";
            require(!combat.transferMobEffect(fromActor,fromActor,toActor,"minecraft:speed",snapshot,null)
                &&from.getEffect(MobEffects.MOVEMENT_SPEED).getAmplifier()==3&&!to.hasEffect(MobEffects.MOVEMENT_SPEED),"Changed preflight source was copied or lost");
            mode="apply-veto";snapshot=MinecraftEffectState.capture(from,from.getEffect(MobEffects.MOVEMENT_SPEED)).key();
            String replacement="{\"id\":\"minecraft:strength\",\"duration\":150,\"amplifier\":1}";
            require(!combat.transferMobEffect(fromActor,fromActor,toActor,"minecraft:speed",snapshot,replacement,null)
                &&from.hasEffect(MobEffects.MOVEMENT_SPEED)&&!to.hasEffect(MobEffects.DAMAGE_BOOST),"Refused conversion erased or copied its source");
            mode="";
            require(combat.transferMobEffect(fromActor,fromActor,toActor,"minecraft:speed",snapshot,replacement,null)
                &&!from.hasEffect(MobEffects.MOVEMENT_SPEED)&&to.getEffect(MobEffects.DAMAGE_BOOST).getDuration()==150
                &&to.getEffect(MobEffects.DAMAGE_BOOST).getAmplifier()==1
                &&((NativeEffectStackAccess)to.getEffect(MobEffects.DAMAGE_BOOST)).worldcombat$hidden()==null,"Explicit native transformation did not commit one replacement");
            from.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED,80,0));
            snapshot=MinecraftEffectState.capture(from,from.getEffect(MobEffects.MOVEMENT_SPEED)).key();mode="target-change";
            require(!combat.transferMobEffect(fromActor,fromActor,toActor,"minecraft:speed",snapshot,null)
                &&from.hasEffect(MobEffects.MOVEMENT_SPEED)&&!to.hasEffect(MobEffects.MOVEMENT_SPEED)&&to.hasEffect(MobEffects.POISON),
                "A changed target store accepted a stale transfer or lost its new native state");
            mode="source-left";
            require(!combat.transferMobEffect(fromActor,fromActor,toActor,"minecraft:speed",snapshot,null)
                &&!to.hasEffect(MobEffects.MOVEMENT_SPEED),"Departed source completed a native transfer");
            mark("Native effect transfer verified: removal/applicability veto, exact owner, hidden merge, cures, modifiers and preflight mutation");
        } finally {fromId=toId=null;source=null;mode="";from.discard();to.discard();}
    }
}

package dev.worldcombat.core.checks;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dev.worldcombat.core.mixin.NativeEffectStackAccess;
import dev.worldcombat.core.runtime.WorldEvent;
import dev.worldcombat.core.world.*;
import net.minecraft.core.Holder;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.living.MobEffectEvent;
import java.util.*;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Real native preflight, commit observations and per-instance natural countdown. */
public final class NativeEffectTransformChecks {
    private static UUID subject;
    private static String mode="",tickKey="";
    private static boolean installed;
    private static int removes,applies,adds;
    public static void onTick(WorldEvent event) {
        if(subject==null||!event.actor().entity().equals(subject)||!mode.equals("clock"))return;
        var data=JsonParser.parseString(event.data()).getAsJsonObject();
        var effect=event.world().mobEffect(event.actor(),data.get("id").getAsString());
        if(effect!=null)tickKey=effect.key();
    }
    private static void install() {
        if(installed)return;installed=true;
        NeoForge.EVENT_BUS.addListener((MobEffectEvent.Remove event)->{
            if(!event.getEntity().getUUID().equals(subject))return;removes++;
            if(mode.equals("remove-veto"))event.setCanceled(true);
        });
        NeoForge.EVENT_BUS.addListener((MobEffectEvent.Applicable event)->{
            if(!event.getEntity().getUUID().equals(subject))return;applies++;
            if(mode.equals("apply-veto"))event.setResult(MobEffectEvent.Applicable.Result.DO_NOT_APPLY);
        });
        NeoForge.EVENT_BUS.addListener((MobEffectEvent.Added event)->{
            if(!event.getEntity().getUUID().equals(subject))return;adds++;
            if(mode.equals("refresh-during-preflight")) {
                mode="";
                var old=event.getEntity().getEffect(MobEffects.MOVEMENT_SPEED);
                event.getEntity().addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED,old.getDuration(),old.getAmplifier()));
            }
        });
    }
    private static String change(LivingEntity actor, Holder<MobEffect> from, String to) {
        var row=new JsonObject();row.addProperty("id",net.minecraft.core.registries.BuiltInRegistries.MOB_EFFECT.getKey(from.value()).toString());
        row.addProperty("key",MinecraftEffectState.capture(actor,actor.getEffect(from)).key());row.addProperty("to",to);
        return row.toString();
    }
    private static String changes(String...rows) {
        var data=new JsonObject();var array=new JsonArray();for(var row:rows)array.add(JsonParser.parseString(row));data.add("changes",array);return data.toString();
    }
    private static int pending(MinecraftCombat combat) {
        try {var field=MinecraftCombat.class.getDeclaredField("endedEffects");field.setAccessible(true);return ((Collection<?>)field.get(combat)).size();}
        catch(ReflectiveOperationException failure){throw new AssertionError("Cannot observe queued native effect facts",failure);}
    }
    public static void run(MinecraftCombat combat, ServerLevel level) {
        install();var actor=mob(EntityType.COW,level,4);var undead=mob(EntityType.ZOMBIE,level,8);
        var handle=combat.bind(actor);var zombie=combat.bind(undead);long owner=87654321;
        try {
            double base=actor.getAttributeValue(Attributes.MOVEMENT_SPEED);
            actor.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED,500,0,false,false,true));
            actor.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED,180,2,false,false,true));
            actor.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN,75,0,true,true,false));
            var speed=actor.getEffect(MobEffects.MOVEMENT_SPEED);var slow=actor.getEffect(MobEffects.MOVEMENT_SLOWDOWN);
            var key=MinecraftEffectState.capture(actor,speed).key();var slowKey=MinecraftEffectState.capture(actor,slow).key();
            long lease=combat.leaseMobEffect(owner,handle,"minecraft:speed",key);
            require(lease>0,"Native transform fixture could not lease original carrier");
            String both=changes(change(actor,MobEffects.MOVEMENT_SPEED,"minecraft:slowness"),change(actor,MobEffects.MOVEMENT_SLOWDOWN,"minecraft:speed"));
            subject=actor.getUUID();removes=applies=adds=0;
            for(String refusal:List.of("remove-veto","apply-veto")) {
                mode=refusal;int queue=pending(combat);
                require(combat.transformMobEffects(handle,handle,both,null)==0,"Refused batch reported committed transformations");
                require(actor.getEffect(MobEffects.MOVEMENT_SPEED)==speed&&actor.getEffect(MobEffects.MOVEMENT_SLOWDOWN)==slow,
                    "Refused batch consumed an original native application");
                require(MinecraftEffectState.matches(actor,speed,key)&&MinecraftEffectState.matches(actor,slow,slowKey)
                    &&combat.mobEffectLeasePresent(handle,lease),"Preflight refusal retired native ownership");
                require(pending(combat)==queue,"Uncommitted preflight queued a script removal/application fact");
            }
            mode="";int queue=pending(combat);
            NeoForge.EVENT_BUS.post(new MobEffectEvent.Added(actor,speed,new MobEffectInstance(MobEffects.MOVEMENT_SPEED,999,4),actor));
            NeoForge.EVENT_BUS.post(new MobEffectEvent.Remove(actor,MobEffects.MOVEMENT_SPEED,null));
            NeoForge.EVENT_BUS.post(new MobEffectEvent.Expired(actor,speed));
            require(MinecraftEffectState.matches(actor,speed,key)&&combat.mobEffectLeasePresent(handle,lease)&&pending(combat)==queue,
                "Manually posted native preflight events were treated as committed facts");
            mode="apply-veto";actor.forceAddEffect(speed,actor);
            require(MinecraftEffectState.matches(actor,speed,key)&&combat.mobEffectLeasePresent(handle,lease),"Rejected forceAdd retired an unchanged owner");
            mode="";
            require(combat.transformMobEffects(handle,handle,both,null)==2,"Same-body inverse pair falsely became stale during preflight");
            var newSpeed=actor.getEffect(MobEffects.MOVEMENT_SPEED);var newSlow=actor.getEffect(MobEffects.MOVEMENT_SLOWDOWN);
            require(newSpeed.getAmplifier()==0&&newSpeed.getDuration()==75&&newSlow.getAmplifier()==2&&newSlow.getDuration()==180,
                "Inverse pair consumed one of its replacement outputs");
            var hidden=((NativeEffectStackAccess)newSlow).worldcombat$hidden();
            require(hidden!=null&&hidden.getDuration()==500&&hidden.getAmplifier()==0&&newSlow.getCures().equals(speed.getCures())
                &&hidden.getCures().equals(((NativeEffectStackAccess)speed).worldcombat$hidden().getCures())
                &&!newSlow.isVisible()&&newSlow.showIcon()&&newSpeed.isAmbient()&&!newSpeed.showIcon(),"Transformation lost native hidden layers, cures or flags");
            require(Math.abs(actor.getAttributeValue(Attributes.MOVEMENT_SPEED)-base*1.2*.55)<1e-6,"Transformed native modifiers were not installed");
            require(!combat.mobEffectLeasePresent(handle,lease)&&!MinecraftEffectState.matches(actor,newSpeed,key),"Committed transformation retained old carrier ownership");
            String dominated=changes(change(actor,MobEffects.MOVEMENT_SPEED,"minecraft:slowness"));queue=pending(combat);
            require(combat.transformMobEffects(handle,handle,dominated,null)==0&&actor.getEffect(MobEffects.MOVEMENT_SPEED)==newSpeed
                &&pending(combat)==queue,"Dominating untouched destination consumed source");
            String freshBoth=changes(change(actor,MobEffects.MOVEMENT_SPEED,"minecraft:slowness"),change(actor,MobEffects.MOVEMENT_SLOWDOWN,"minecraft:speed"));
            mode="refresh-during-preflight";String oldKey=MinecraftEffectState.capture(actor,newSpeed).key();
            require(combat.transformMobEffects(handle,handle,freshBoth,null)==0&&actor.getEffect(MobEffects.MOVEMENT_SPEED)==newSpeed
                &&!MinecraftEffectState.matches(actor,newSpeed,oldKey),"Real identical refresh during preflight did not invalidate the snapshot");
            mode="";subject=undead.getUUID();undead.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED,100,1));
            var zombieSpeed=undead.getEffect(MobEffects.MOVEMENT_SPEED);
            require(combat.transformMobEffects(handle,zombie,changes(change(undead,MobEffects.MOVEMENT_SPEED,"minecraft:regeneration")),null)==0
                &&undead.getEffect(MobEffects.MOVEMENT_SPEED)==zombieSpeed&&!undead.hasEffect(MobEffects.REGENERATION),"Native undead immunity destroyed the original buff");
            subject=actor.getUUID();mode="";actor.removeAllEffects();
            actor.addEffect(new MobEffectInstance(MobEffects.REGENERATION,100,0));actor.addEffect(new MobEffectInstance(MobEffects.REGENERATION,50,1));
            var clock=actor.getEffect(MobEffects.REGENERATION);String clockKey=MinecraftEffectState.capture(actor,clock).key();
            mode="clock";tickKey="";clock.tick(actor,()->{});
            require(tickKey.equals(clockKey)&&MinecraftEffectState.matches(actor,clock,clockKey),"Natural effect callback/countdown changed the opaque application key");
            require(((NativeEffectStackAccess)clock).worldcombat$hidden().getDuration()==99,"Hidden natural countdown fixture did not run");
            clock.update(new MobEffectInstance(MobEffects.REGENERATION,clock.getDuration()+1,clock.getAmplifier()));
            require(!MinecraftEffectState.matches(actor,clock,clockKey),"One-tick authored duration mutation was mistaken for natural countdown");
            clockKey=MinecraftEffectState.capture(actor,clock).key();hidden=((NativeEffectStackAccess)clock).worldcombat$hidden();
            hidden.update(new MobEffectInstance(MobEffects.REGENERATION,hidden.getDuration()+1,hidden.getAmplifier()));
            require(!MinecraftEffectState.matches(actor,clock,clockKey),"Hidden-stack mutation was ignored by opaque comparison");
            clockKey=MinecraftEffectState.capture(actor,clock).key();clock.getCures().clear();
            require(!MinecraftEffectState.matches(actor,clock,clockKey),"Native cure metadata mutation retained an old key");
            mode="";actor.addEffect(new MobEffectInstance(MobEffects.GLOWING,-1));var infinite=actor.getEffect(MobEffects.GLOWING);
            String infiniteKey=MinecraftEffectState.capture(actor,infinite).key();infinite.tick(actor,()->{});
            require(MinecraftEffectState.matches(actor,infinite,infiniteKey),"Infinite effect changed key during native tick");
            actor.forceAddEffect(infinite,actor);
            require(!MinecraftEffectState.matches(actor,infinite,infiniteKey),"Accepted same-object forceAdd retained old ownership");
            mark("Native effect transformation verified: atomic inverse pair, veto/immunity/dominance preservation, no speculative facts, hidden/cures/attributes, native refresh CAS and exact natural-clock ownership");
        } finally {subject=null;mode=tickKey="";combat.release(owner,"fixture-end");actor.discard();undead.discard();}
    }
}

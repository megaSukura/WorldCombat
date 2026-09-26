package dev.worldcombat.core.world;

import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import com.mojang.serialization.JsonOps;
import dev.worldcombat.core.mixin.NativeEffectAccess;
import dev.worldcombat.core.mixin.NativeEffectStackAccess;
import dev.worldcombat.core.runtime.*;
import net.minecraft.core.Holder;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.effect.*;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.EventHooks;
import net.neoforged.neoforge.event.entity.living.MobEffectEvent;
import java.util.*;

/** Two native states are preflighted and compared before either is written. Callbacks observe the committed transfer. */
public final class NativeEffectTransfer {
    private NativeEffectTransfer() {}
    private static boolean installed(MinecraftCombat combat, ActorHandle target, LivingEntity entity, Holder<MobEffect> type, MobEffectInstance expected) {
        return combat.resolve(target) == entity && entity.isAlive() && !entity.isRemoved() && entity.getEffect(type) == expected;
    }
    private static JsonElement data(MobEffectInstance effect) { return MobEffectInstance.CODEC.encodeStart(JsonOps.INSTANCE,effect).getOrThrow(); }
    private static MobEffectInstance copy(MobEffectInstance effect) { return MobEffectInstance.CODEC.parse(JsonOps.INSTANCE,data(effect)).getOrThrow(); }
    private static boolean same(LivingEntity entity, Holder<MobEffect> id, MobEffectInstance previous, JsonElement snapshot) {
        var current = entity.getEffect(id);
        return current == previous && (current == null || data(current).equals(snapshot));
    }
    private record Stored(MobEffectInstance instance, JsonElement data) {}
    private static Map<Holder<MobEffect>,Stored> snapshot(LivingEntity entity) {
        var result=new HashMap<Holder<MobEffect>,Stored>();
        entity.getActiveEffectsMap().forEach((id,effect)->result.put(id,new Stored(effect,data(effect))));
        return result;
    }
    private static boolean unchanged(LivingEntity entity, Map<Holder<MobEffect>,Stored> state) {
        if(entity.getActiveEffectsMap().size()!=state.size())return false;
        for(var entry:state.entrySet())if(!same(entity,entry.getKey(),entry.getValue().instance,entry.getValue().data))return false;
        return true;
    }
    private static boolean dominates(MobEffectInstance old, MobEffectInstance moving) {
        return old != null && (old.getAmplifier() > moving.getAmplifier() || old.getAmplifier() == moving.getAmplifier()
            && (old.isInfiniteDuration() || !moving.isInfiniteDuration() && old.getDuration() >= moving.getDuration()));
    }
    private static MobEffectInstance merged(MobEffectInstance previous, MobEffectInstance incoming) {
        if (previous == null) return copy(incoming);
        var value = copy(previous); var chain = new ArrayList<MobEffectInstance>();
        for(var current=incoming;current!=null;current=((NativeEffectStackAccess)current).worldcombat$hidden()) chain.add(current);
        // Native update merges one level; replay deepest first to retain both existing and transferred hidden stacks.
        for(int i=chain.size()-1;i>=0;i--) {
            var layer = copy(chain.get(i)); ((NativeEffectStackAccess)layer).worldcombat$hidden(null); value.update(layer);
        }
        value.copyBlendState(previous); return value;
    }
    /** Exact replacement uses the same native gates without an intermediate empty carrier. Empty expected means absent. */
    public static boolean replace(MinecraftCombat combat, ActorHandle operator, ActorHandle target, String id,
                                  String expected, int ticks, int amplifier, ExecutionOrigin origin) {
        combat.checkThread();
        if(ticks< -1||ticks==0||amplifier<0||amplifier>255)throw new IllegalArgumentException("Invalid replacement native effect");
        var caller=combat.resolve(operator);var entity=combat.resolve(target);
        if(caller==null||entity==null||caller.level()!=entity.level()||caller.distanceToSqr(entity)>64*64)return false;
        var type=BuiltInRegistries.MOB_EFFECT.getHolder(ResourceLocation.parse(id)).orElse(null);
        if(type==null)return false;
        var old=entity.getEffect(type);
        if(old==null?!expected.isEmpty():!MinecraftEffectState.capture(entity,old).key().equals(expected))return false;
        var before=snapshot(entity);var next=new MobEffectInstance(type,ticks,amplifier,false,true,true);
        if(old!=null&&EventHooks.onEffectRemoved(entity,type,null))return false;
        if(!unchanged(entity,before)||!NativeMobEffectGate.permits(entity,next,caller,origin)||!unchanged(entity,before))return false;
        NeoForge.EVENT_BUS.post(new MobEffectEvent.Added(entity,old,next,caller));
        if(!unchanged(entity,before)||combat.resolve(operator)!=caller||combat.resolve(target)!=entity
            ||!caller.isAlive()||!entity.isAlive()||caller.level()!=entity.level()||caller.distanceToSqr(entity)>64*64)return false;
        entity.getActiveEffectsMap().put(type,next);
        PostCommitNotifications.run(combat,"world_combat_core:native_effect_replace",() -> installed(combat,target,entity,type,next),
            () -> { if(old!=null)((NativeEffectAccess)entity).worldcombat$effectRemoved(old); },
            () -> ((NativeEffectAccess)entity).worldcombat$effectAdded(next,caller),
            () -> next.onEffectAdded(entity), () -> next.onEffectStarted(entity));
        return true;
    }
    public static boolean transfer(MinecraftCombat combat, ActorHandle operator, ActorHandle from, ActorHandle to,
                                   String id, String expected, ExecutionOrigin origin) {
        return transfer(combat,operator,from,to,id,expected,null,origin);
    }
    public static boolean transfer(MinecraftCombat combat, ActorHandle operator, ActorHandle from, ActorHandle to,
                                   String id, String expected, String replacement, ExecutionOrigin origin) {
        combat.checkThread();
        var caller=combat.resolve(operator);var sender=combat.resolve(from);var receiver=combat.resolve(to);
        if(caller==null||sender==null||receiver==null||sender==receiver||caller.level()!=sender.level()||caller.level()!=receiver.level()
            ||caller.distanceToSqr(sender)>64*64||caller.distanceToSqr(receiver)>64*64) return false;
        var type=BuiltInRegistries.MOB_EFFECT.getHolder(ResourceLocation.parse(id)).orElse(null);
        if(type==null) return false;
        var original=sender.getEffect(type);
        if(original==null||!MinecraftEffectState.capture(sender,original).key().equals(expected)) return false;
        var incoming=copy(original);
        if(replacement!=null) {
            var value=JsonParser.parseString(replacement).getAsJsonObject();
            if(!value.keySet().equals(Set.of("id","duration","amplifier"))) throw new IllegalArgumentException("Expected replacement effect id, duration and amplifier");
            var nextType=BuiltInRegistries.MOB_EFFECT.getHolder(ResourceLocation.parse(value.get("id").getAsString())).orElse(null);
            if(nextType==null) return false;
            int ticks=value.get("duration").getAsBigDecimal().intValueExact(),amp=value.get("amplifier").getAsBigDecimal().intValueExact();
            if(ticks< -1||ticks==0||amp<0||amp>255) throw new IllegalArgumentException("Invalid replacement native effect");
            incoming=new MobEffectInstance(nextType,ticks,amp,original.isAmbient(),original.isVisible(),original.showIcon());
        }
        var targetType=incoming.getEffect();var old=receiver.getEffect(targetType);
        if(dominates(old,incoming)) return false;
        var sourceStore=snapshot(sender);var targetStore=snapshot(receiver);
        // Native removal veto and exact native applicability each run once; rejection leaves both stores untouched.
        if(EventHooks.onEffectRemoved(sender,type,null)) return false;
        if(!unchanged(sender,sourceStore)||!unchanged(receiver,targetStore)
            ||!MinecraftEffectState.capture(sender,original).key().equals(expected)) return false;
        if(!NativeMobEffectGate.permits(receiver,incoming,caller,origin)) return false;
        if(!unchanged(sender,sourceStore)||!unchanged(receiver,targetStore)
            ||!MinecraftEffectState.capture(sender,original).key().equals(expected)) return false;
        NeoForge.EVENT_BUS.post(new MobEffectEvent.Added(receiver,old,incoming,caller));
        if(!unchanged(sender,sourceStore)||!unchanged(receiver,targetStore)
            ||!MinecraftEffectState.capture(sender,original).key().equals(expected)) return false;
        if(combat.resolve(operator)!=caller||combat.resolve(from)!=sender||combat.resolve(to)!=receiver
            ||!caller.isAlive()||!sender.isAlive()||!receiver.isAlive()||caller.level()!=sender.level()||caller.level()!=receiver.level()
            ||caller.distanceToSqr(sender)>64*64||caller.distanceToSqr(receiver)>64*64) return false;
        var next=merged(old,incoming);
        sender.getActiveEffectsMap().remove(type); receiver.getActiveEffectsMap().put(targetType,next);
        // No user/mod callback runs between these two storage writes.
        if(old==null) PostCommitNotifications.run(combat,"world_combat_core:native_effect_transfer",() -> installed(combat,to,receiver,targetType,next),
            () -> ((NativeEffectAccess)sender).worldcombat$effectRemoved(original),
            () -> ((NativeEffectAccess)receiver).worldcombat$effectAdded(next,caller),
            () -> next.onEffectAdded(receiver), () -> next.onEffectStarted(receiver));
        else PostCommitNotifications.run(combat,"world_combat_core:native_effect_transfer",() -> installed(combat,to,receiver,targetType,next),
            () -> ((NativeEffectAccess)sender).worldcombat$effectRemoved(original),
            () -> ((NativeEffectAccess)receiver).worldcombat$effectUpdated(next,true,caller),
            () -> next.onEffectStarted(receiver));
        return true;
    }
}

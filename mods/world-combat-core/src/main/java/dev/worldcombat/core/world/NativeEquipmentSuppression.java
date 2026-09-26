package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.*;
import net.minecraft.core.Holder;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.*;
import java.util.*;

/** Scope-owned suppression of equipment-declared native attribute modifiers, keeping stacks and unrelated attributes intact. */
public final class NativeEquipmentSuppression {
    private record Key(Holder<Attribute> attribute, ResourceLocation modifier) {}
    private record Declared(EquipmentSlot slot, AttributeModifier modifier) {}
    private record Removed(AttributeInstance attribute, Declared declaration) {}
    private static final class Entry {
        final LivingEntity entity;
        final Set<Long> owners = new HashSet<>();
        final Map<Key, Removed> removed = new HashMap<>();
        Entry(LivingEntity entity) { this.entity = entity; }
    }
    private final MinecraftCombat combat;
    private final Map<ActorHandle, Entry> entries = new HashMap<>();
    public NativeEquipmentSuppression(MinecraftCombat combat) { this.combat = combat; }
    private static Map<Key, Declared> declarations(LivingEntity entity) {
        var result = new HashMap<Key, Declared>();
        for (var slot : EquipmentSlot.values()) entity.getItemBySlot(slot).forEachModifier(slot, (attribute, modifier) ->
            result.put(new Key(attribute, modifier.id()), new Declared(slot, modifier)));
        return result;
    }
    public int acquire(long owner, ActorHandle actor) {
        combat.checkThread(); if (owner == 0) throw new IllegalStateException("Equipment suppression needs an action/effect owner");
        var entity = combat.resolve(actor); if (entity == null) return 0;
        var entry = entries.computeIfAbsent(actor, ignored -> new Entry(entity)); entry.owners.add(owner);
        update(entry); return (int) entry.removed.values().stream().map(value -> value.declaration().slot()).distinct().count();
    }
    private static void update(Entry entry) {
        var declared = declarations(entry.entity);
        entry.removed.entrySet().removeIf(old -> !Objects.equals(declared.get(old.getKey()), old.getValue().declaration()));
        declared.forEach((key, value) -> {
            var attribute = entry.entity.getAttribute(key.attribute()); if (attribute == null) return;
            var actual = attribute.getModifier(key.modifier());
            if (actual != null && actual.equals(value.modifier())) {
                attribute.removeModifier(key.modifier()); entry.removed.put(key, new Removed(attribute, value));
            }
        });
    }
    private static void restore(Entry entry) {
        var current = declarations(entry.entity);
        entry.removed.forEach((key, value) -> {
            if (Objects.equals(current.get(key), value.declaration()) && value.attribute().getModifier(key.modifier()) == null)
                value.attribute().addTransientModifier(value.declaration().modifier());
        });
        entry.removed.clear();
    }
    public void tick() {
        for (var iterator = entries.entrySet().iterator(); iterator.hasNext();) {
            var pair = iterator.next();
            if (combat.resolve(pair.getKey()) != pair.getValue().entity) { restore(pair.getValue()); iterator.remove(); }
            else update(pair.getValue());
        }
    }
    public void release(long owner) {
        entries.entrySet().removeIf(pair -> {
            var entry = pair.getValue(); entry.owners.remove(owner);
            if (!entry.owners.isEmpty()) return false;
            restore(entry); return true;
        });
    }
    public void stop() { entries.values().forEach(NativeEquipmentSuppression::restore); entries.clear(); }
}

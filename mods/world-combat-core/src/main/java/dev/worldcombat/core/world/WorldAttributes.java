package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.*;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import java.util.*;

/** Transient attribute modifiers belong to their action or effect and preserve other modifiers. */
public final class WorldAttributes {
    private record Key(long owner, ActorHandle target, ResourceLocation attribute) {}
    private record Lease(AttributeInstance attribute, ResourceLocation modifier) {}
    private final MinecraftCombat combat;
    private final Map<Key, Lease> leases = new HashMap<>();
    public WorldAttributes(MinecraftCombat combat) { this.combat = combat; }
    public boolean set(long owner, ActorHandle target, String attribute, double amount, String operation) {
        combat.checkThread();
        if (owner == 0) throw new IllegalStateException("Attribute modifiers need an action or effect owner");
        var entity = combat.resolve(target); if (entity == null) throw new ActionInactiveException("Target left");
        var id = ResourceLocation.parse(attribute);
        var holder = BuiltInRegistries.ATTRIBUTE.getHolder(id).orElseThrow(() -> new IllegalArgumentException("Unknown attribute"));
        var instance = entity.getAttribute(holder); if (instance == null) return false;
        var kind = switch (operation) {
            case "add_value" -> AttributeModifier.Operation.ADD_VALUE;
            case "add_multiplied_base" -> AttributeModifier.Operation.ADD_MULTIPLIED_BASE;
            case "add_multiplied_total" -> AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL;
            default -> throw new IllegalArgumentException("Unknown modifier operation");
        };
        var key = new Key(owner, target, id);
        var modifier = ResourceLocation.fromNamespaceAndPath("world_combat_core", "lease/" + owner + "/" + id.getNamespace() + "/" + id.getPath());
        var current = instance.getModifier(modifier);
        if (current != null && current.amount() == amount && current.operation() == kind) return true;
        instance.removeModifier(modifier);
        instance.addTransientModifier(new AttributeModifier(modifier, amount, kind));
        leases.put(key, new Lease(instance, modifier)); return true;
    }
    /** Native arithmetic with only this scope's contribution omitted; no mutations or attribute packets. */
    public AttributeObservation excluding(long owner, ActorHandle target, String attribute) {
        var entity = combat.resolve(target); if (entity == null) return null;
        var id = ResourceLocation.parse(attribute);
        var holder = BuiltInRegistries.ATTRIBUTE.getHolder(id).orElse(null);
        if (holder == null) return null;
        var instance = entity.getAttribute(holder); if (instance == null) return null;
        var own = leases.get(new Key(owner, target, id));
        if (own == null) return new AttributeObservation(instance.getBaseValue(), instance.getValue());
        double added = instance.getBaseValue();
        for (var modifier : instance.getModifiers()) if (!modifier.id().equals(own.modifier()) && modifier.operation() == AttributeModifier.Operation.ADD_VALUE) added += modifier.amount();
        double value = added;
        for (var modifier : instance.getModifiers()) if (!modifier.id().equals(own.modifier()) && modifier.operation() == AttributeModifier.Operation.ADD_MULTIPLIED_BASE) value += added * modifier.amount();
        for (var modifier : instance.getModifiers()) if (!modifier.id().equals(own.modifier()) && modifier.operation() == AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL) value *= 1 + modifier.amount();
        return new AttributeObservation(instance.getBaseValue(), holder.value().sanitizeValue(value));
    }
    public void release(long owner) {
        leases.entrySet().removeIf(entry -> {
            if (entry.getKey().owner() != owner) return false;
            entry.getValue().attribute().removeModifier(entry.getValue().modifier()); return true;
        });
    }
    public int count() { return leases.size(); }
}

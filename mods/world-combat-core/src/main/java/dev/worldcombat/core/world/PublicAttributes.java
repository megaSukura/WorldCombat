package dev.worldcombat.core.world;

import net.minecraft.core.registries.Registries;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.*;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.EntityAttributeModificationEvent;
import net.neoforged.neoforge.registries.*;
import java.lang.ref.WeakReference;
import java.util.*;

/** Native registration and change notification only; gameplay interpretation belongs to scripts. */
public final class PublicAttributes {
    private static final DeferredRegister<Attribute> REGISTRY = DeferredRegister.create(Registries.ATTRIBUTE, "world_combat");
    public static final DeferredHolder<Attribute, Attribute> SKILL_HASTE = number("skill_haste", -99.999999);
    public static final DeferredHolder<Attribute, Attribute> HEALING_RECEIVED = number("healing_received", -100);
    public static final DeferredHolder<Attribute, Attribute> CURIOSITY = number("curiosity", -Double.MAX_VALUE);
    public static final DeferredHolder<Attribute, Attribute> RISK = number("risk", -Double.MAX_VALUE);
    public static final DeferredHolder<Attribute, Attribute> PERSISTENCE = number("persistence", -Double.MAX_VALUE);
    private static final Map<AttributeInstance, WeakReference<LivingEntity>> OWNERS = Collections.synchronizedMap(new WeakHashMap<>());
    private static DeferredHolder<Attribute, Attribute> number(String id, double minimum) {
        return REGISTRY.register(id, () -> new RangedAttribute("worldcombat.attributes." + id, 0, minimum, Double.MAX_VALUE).setSyncable(true));
    }
    public static Collection<DeferredHolder<Attribute, ? extends Attribute>> entries() { return REGISTRY.getEntries(); }
    public static void register(IEventBus bus) {
        REGISTRY.register(bus);
        bus.addListener((EntityAttributeModificationEvent event) -> {
            for (var type : event.getTypes()) for (var attribute : entries())
                if (!event.has(type, attribute)) event.add(type, attribute);
        });
    }
    public static void observe(LivingEntity entity) {
        for (var attribute : entries()) {
            var instance = entity.getAttribute(attribute);
            if (instance != null) OWNERS.put(instance, new WeakReference<>(entity));
        }
    }
    public static void forget(LivingEntity entity) {
        for (var attribute : entries()) { var instance = entity.getAttribute(attribute); if (instance != null) OWNERS.remove(instance); }
    }
    public static void changed(AttributeInstance instance) {
        var reference = OWNERS.get(instance);
        var entity = reference == null ? null : reference.get();
        if (entity != null && !entity.level().isClientSide()) NeoForge.EVENT_BUS.post(new CombatAttributeChangedEvent(entity));
    }
    private PublicAttributes() {}
}

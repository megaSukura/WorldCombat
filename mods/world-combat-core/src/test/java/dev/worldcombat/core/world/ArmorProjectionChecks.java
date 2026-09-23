package dev.worldcombat.core.world;

import com.google.gson.JsonObject;
import net.minecraft.core.Holder;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.damagesource.*;
import net.minecraft.world.entity.*;
import net.minecraft.world.entity.ai.attributes.*;
import net.minecraft.world.item.ItemStack;
import net.neoforged.neoforge.common.damagesource.DamageContainer;
import net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent;
import sun.misc.Unsafe;
import java.util.List;

/** Actual attribute calculation, CombatRules and NeoForge reduction chain; no server is started. */
public final class ArmorProjectionChecks {
    public static final class Receiver extends LivingEntity {
        AttributeInstance armor, toughness;
        private Receiver() { super(null, null); }
        @Override public AttributeInstance getAttribute(Holder<Attribute> id) { return id == Attributes.ARMOR ? armor : toughness; }
        @Override public double getAttributeValue(Holder<Attribute> id) { return getAttribute(id).getValue(); }
        @Override public int getArmorValue() { return (int) armor.getValue(); }
        @Override public Iterable<ItemStack> getArmorSlots() { return List.of(); }
        @Override public ItemStack getItemBySlot(EquipmentSlot slot) { return null; }
        @Override public void setItemSlot(EquipmentSlot slot, ItemStack stack) { throw new AssertionError("Live equipment mutated"); }
        @Override public HumanoidArm getMainArm() { return HumanoidArm.RIGHT; }
    }
    static void check(boolean value, String message) { if (!value) throw new AssertionError(message); }
    static void close(double actual, double expected, String label) { check(Math.abs(actual - expected) < .0001, label + ": " + actual + " != " + expected); }
    static AttributeInstance attribute(double base, double maximum) {
        var value = new AttributeInstance(Holder.direct(new RangedAttribute("checks", 0, 0, maximum)), ignored -> {});
        value.setBaseValue(base); return value;
    }
    static void modifier(AttributeInstance value, String id, double amount, AttributeModifier.Operation operation) {
        value.addTransientModifier(new AttributeModifier(ResourceLocation.parse("checks:" + id), amount, operation));
    }
    static Receiver receiver(AttributeInstance armor, AttributeInstance toughness) throws Exception {
        // Only the native numeric/reduction path is under test. World/entity construction is intentionally absent.
        var field = Unsafe.class.getDeclaredField("theUnsafe"); field.setAccessible(true);
        var result = (Receiver) ((Unsafe) field.get(null)).allocateInstance(Receiver.class);
        result.armor = armor; result.toughness = toughness; return result;
    }
    static float exercise(Receiver victim, float amount, JsonObject metadata, float extra) {
        var source = new DamageSource(Holder.direct(new DamageType("checks", 0)));
        var container = new DamageContainer(source, amount);
        var event = new LivingIncomingDamageEvent(victim, container);
        event.addReductionModifier(DamageContainer.Reduction.ARMOR, (ignored, reduction) -> reduction + extra);
        ArmorProjection.apply(event, metadata);
        float nativeDamage = CombatRules.getDamageAfterAbsorb(victim, amount, source, victim.getArmorValue(), (float) victim.toughness.getValue());
        container.setReduction(DamageContainer.Reduction.ARMOR, amount - nativeDamage);
        return container.getNewDamage();
    }
    public static void main(String[] args) throws Exception {
        net.minecraft.SharedConstants.tryDetectVersion();
        net.neoforged.fml.loading.LoadingModList.of(List.of(), List.of(), List.of(), List.of(), java.util.Map.of());
        net.minecraft.server.Bootstrap.bootStrap();
        var armor = attribute(18, 30); var toughness = attribute(6, 20);
        modifier(armor, "equipment", 5, AttributeModifier.Operation.ADD_VALUE);
        modifier(armor, "base", .5, AttributeModifier.Operation.ADD_MULTIPLIED_BASE);
        modifier(armor, "total", .2, AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL);
        modifier(toughness, "tough_equipment", 2, AttributeModifier.Operation.ADD_VALUE);
        modifier(toughness, "tough_base", .5, AttributeModifier.Operation.ADD_MULTIPLIED_BASE);
        modifier(toughness, "tough_total", .2, AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL);
        close(ArmorProjection.remaining(armor, 18), 9, "All three external modifier operations retained");
        close(ArmorProjection.remaining(toughness, 6), 3.6, "External toughness retained");
        close(armor.getBaseValue(), 18, "Original base unchanged"); close(armor.getValue(), 30, "Original clamping unchanged");
        armor.setBaseValue(150);
        close(ArmorProjection.remaining(armor, 150), 9, "Saturated base still retains equipment");
        var metadata = new JsonObject(); metadata.addProperty("armorExcluded", 150); metadata.addProperty("toughnessExcluded", 6);
        var victim = receiver(armor, toughness);
        var source = new DamageSource(Holder.direct(new DamageType("checks", 0)));
        float expected = CombatRules.getDamageAfterAbsorb(victim, 20, source, 9, 3.6f);
        close(exercise(victim, 20, metadata, 0), expected, "Native armor chain matches only external attributes");
        close(exercise(victim, 20, metadata, 2), expected - 2, "Earlier external reduction retained");
        close(exercise(victim, 20, new JsonObject(), 0), CombatRules.getDamageAfterAbsorb(victim, 20, source, 30, (float) toughness.getValue()), "Unannotated native source retains full armor");
        var naked = receiver(attribute(0, 30), attribute(0, 20));
        close(exercise(naked, 16384, new JsonObject(), 0), 16384, "Large naked damage not capped");
        var projectionOnly = receiver(attribute(150, 30), attribute(6, 20));
        close(exercise(projectionOnly, 20, metadata, 0), 20, "Pure accounted projection is not applied twice");
        var worn = attribute(0, 30);
        modifier(worn, "worn_armor", 12, AttributeModifier.Operation.ADD_VALUE);
        modifier(worn, "positive_ladder", 6, AttributeModifier.Operation.ADD_VALUE);
        modifier(worn, "external_multiplier", .25, AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL);
        close(ArmorProjection.remaining(worn, 0, 6), 15, "Additive exclusion retains real equipment and its multiplier");
        close(worn.getValue(), 22.5, "Additive exclusion never changes live armor");
        worn.removeModifier(ResourceLocation.parse("checks:positive_ladder"));
        modifier(worn, "negative_ladder", -6, AttributeModifier.Operation.ADD_VALUE);
        close(ArmorProjection.remaining(worn, 0, -6), 15, "Ignoring a negative ladder restores only that contribution");
        var container = new DamageContainer(source, expected);
        container.setReduction(DamageContainer.Reduction.MOB_EFFECTS, expected * .2f);
        float afterResistance = container.getNewDamage();
        container.setReduction(DamageContainer.Reduction.ENCHANTMENTS, afterResistance - CombatRules.getDamageAfterMagicAbsorb(afterResistance, 5));
        close(container.getNewDamage(), expected * .8f * .8f, "Native resistance and enchantment stages remain separate");
        System.out.println("PASS native armor projection: addition/base/total modifiers, saturation, toughness, unchanged attributes, NeoForge reduction composition, ordinary native armor, large damage and subsequent reductions (no server)");
    }
}

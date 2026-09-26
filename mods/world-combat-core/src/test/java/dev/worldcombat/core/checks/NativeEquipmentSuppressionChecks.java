package dev.worldcombat.core.checks;

import dev.worldcombat.core.world.MinecraftCombat;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.*;
import net.minecraft.world.entity.ai.attributes.*;
import net.minecraft.world.item.*;
import static dev.worldcombat.core.checks.TestWorld.*;

public final class NativeEquipmentSuppressionChecks {
    public static void run(MinecraftCombat combat, ServerLevel level) {
        var entity = mob(EntityType.ZOMBIE, level, 2); var actor = combat.bind(entity);
        var armor = entity.getAttribute(Attributes.ARMOR);
        require(armor != null, "Native armor fixture missing");
        armor.addTransientModifier(new AttributeModifier(ResourceLocation.parse("checks:inherent"), 5, AttributeModifier.Operation.ADD_VALUE));
        double inherent = armor.getValue();
        try {
            entity.setItemSlot(EquipmentSlot.CHEST, new ItemStack(Items.DIAMOND_CHESTPLATE)); entity.tick();
            require(armor.getValue() > inherent, "Equipment modifier was never applied");
            require(combat.suppressEquipment(-922001, actor) == 1 && armor.getValue() == inherent, "Equipment suppression erased inherent armor or retained chestplate");
            combat.suppressEquipment(-922002, actor); combat.release(-922001,"checks:one-left");
            require(armor.getValue() == inherent, "Ending one overlapping suppression restored equipment early");
            entity.setItemSlot(EquipmentSlot.CHEST, new ItemStack(Items.LEATHER_CHESTPLATE)); entity.tick(); combat.suppressEquipment(-922002,actor);
            require(armor.getValue() == inherent, "Changing equipment escaped its live suppression");
            combat.release(-922002,"checks:ended");
            require(armor.getValue() == inherent + 3 && entity.getItemBySlot(EquipmentSlot.CHEST).is(Items.LEATHER_CHESTPLATE), "Ending suppression restored stale gear or moved items");
            mark("Native equipment suppression verified: declared modifiers, independent armor, overlap, gear changes and exact restoration");
        } finally { combat.release(-922001,"checks:cleanup"); combat.release(-922002,"checks:cleanup"); entity.discard(); }
    }
}

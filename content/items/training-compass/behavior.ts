/** A vanilla compass in an active Curios slot guides an idle companion's exploration. */
EquipmentBehavior.define("world_combat:training_compass", equipment =>
    String(equipment.provider()) === "curios" && String(equipment.item()) === "minecraft:compass",
    context => BehaviorProfiles.add(context.frame, "equipment:minecraft:compass", TrainingCompass.modifiers));

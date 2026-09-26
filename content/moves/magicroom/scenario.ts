// 魔法空间的可执行设计说明：一片按在地面、双方平等生效的静默空间，暂停装备提供的属性增益。
// 必然事实：魔法空间被放出来过；站在空间里的施法者身上出现了共享身份 world_combat:status/magicroom；
// 一具穿了钻石头+钻石头盔的原版生物在区域内护甲属性回落、离开后原样恢复（装备与修饰没有丢失）。
// 「宝可梦携带物效果被封」走共享的 NativeModifiers suppressItems 层，不是 MobEffect，smoke 读不到，
// 写进 note 供完整装配试玩核对。
Smoke.scenario("magicroom", function (stage) {
    stage.weather("clear");
    stage.time("day");

    // 施法者空手，目标带一件携带物，于是 AI 认为「敌人装备收益更高、己方依赖小」而出手。
    const caster = stage.pokemon({ species: "abra", level: 32, moves: ["magicroom"], at: [-3, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 22, moves: ["tackle"], item: "cobblemon:choice_band", at: [5, 0, 0] });
    stage.hostile(caster, target);

    // 一具静止的原版生物，穿上声明了属性修饰的装备，用来读「装备贡献在区域内消失」。
    const guard = stage.mob({ type: "minecraft:zombie", at: [16, 0, 0] });
    stage.noai(guard);
    const guardUuid = guard.ref.split("/")[0];
    stage.command("item replace entity " + guardUuid + " armor.head with minecraft:diamond_helmet");
    stage.command("item replace entity " + guardUuid + " armor.chest with minecraft:diamond_chestplate");
    let armored = 0, inside = 0;

    stage.until(900, function () {
        return stage.casts("magicroom", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/magicroom");
    }, function () {
        stage.expect(stage.casts("magicroom", caster) > 0, "magicroom was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/magicroom"), "the caster standing inside carried the shared magicroom identity");

        // 落点确定的一片空间，覆盖穿装备的原版生物，直接读它护甲属性的真实变化。
        armored = stage.attribute(guard, "minecraft:generic.armor");
        stage.field(PokemonSkills.magicRoomField, [16, 0, 0], 600, 5, { density: 24 }, caster);
        stage.until(160, function () {
            return stage.attribute(guard, "minecraft:generic.armor") < armored - 1;
        }, function () {
            inside = stage.attribute(guard, "minecraft:generic.armor");
            stage.expect(inside < armored - 1, "the armored body's equipment contribution was suppressed inside the space");
            stage.command("tp " + guardUuid + " ~36 ~ ~");
            stage.until(160, function () {
                return Math.abs(stage.attribute(guard, "minecraft:generic.armor") - armored) < 0.6;
            }, function () {
                stage.expect(Math.abs(stage.attribute(guard, "minecraft:generic.armor") - armored) < 0.6,
                    "leaving the space restored the same equipment's contribution");
                stage.expect(stage.heldItem(target) === "cobblemon:choice_band", "the target's held item survived the space");
                stage.note("魔法空间按在落点，半径内的活体带共享身份；每名成员有一份接收者投影，在有效期内调用 world.suppressEquipment 暂停原生装备槽声明的属性增益，宝可梦再叠加 NativeModifiers suppressItems 封住携带物效果。装备与附魔不移动、不销毁，离圈或空间结束即恢复当前装备的贡献；第三方自定义槽位与其他模组的主动能力不在契约内。半径、时长、密度随身高/特攻/等级变化，长默与快默各有取舍。smoke 读不到携带物效果本身，兑现留给完整装配试玩。", {
                    armored: Math.round(armored * 100) / 100,
                    inside: Math.round(inside * 100) / 100,
                    casts: stage.casts("magicroom", caster)
                });
                stage.done();
            }, "the armored body left and its equipment contribution returned");
        }, "the armored body's equipment was suppressed");
    }, "the silent space holds");
});

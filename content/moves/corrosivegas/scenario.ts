/**
 * 腐蚀气体 / corrosivegas 的可执行设计说明。
 *
 * 场面：石地。只会腐蚀气体的臭鼬坦克（Skuntank）带着一名手持浆果的队友（同一队），对面是一名手持铁剑、
 *   原地不动的掠夺者。先让 AI 在「雾里有装备队友」的局面下站着，再让队友离开，观察它是否才动手。
 *
 * 必然事实：有装备队友在雾半径内时本招没有被提交；队友离开后本招被提交，雾里那名持剑敌人身上出现沾酸身份，
 *   铁剑没有被删除而是掉了 6% 最大耐久（15 点），保留物品本体。命中的精确粒子与颜色留给试玩。
 */
Smoke.scenario("corrosivegas", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 8], "minecraft:stone");
    var caster = stage.pokemon({ species: "Skuntank", level: 34, moves: ["corrosivegas"], at: [0, 0, 0] });
    var near = stage.mob({ type: "minecraft:pillager", at: [2, 0, 0] });
    stage.noai(near);
    stage.command("item replace entity " + near.ref.split("/")[0] + " weapon.mainhand with minecraft:iron_sword");
    // 手持道具的队友站进雾半径：AI 应把它算作强负收益，按住不喷。
    var ally = stage.pokemon({ species: "Bidoof", level: 5, moves: ["splash"], item: "cobblemon:cheri_berry", at: [1, 0, 1] });
    stage.team("cg_ally", [caster, ally]);
    stage.hostile(caster, near);

    stage.after(220, function () {
        stage.expect(stage.casts("corrosivegas", caster) === 0, "有装备队友在雾里时，伙伴没有喷酸");
        stage.note("队友携带着浆果站在雾半径内，AI 把它的道具损失计为强负收益。",
            { casts: stage.casts("corrosivegas", caster), allyHeld: stage.heldItem(ally) });
        // 队友走远，负收益解除，观察这一刻才出手。
        stage.command("tp " + ally.ref.split("/")[0] + " 200 -60 200");
        stage.until(900, function () {
            return stage.casts("corrosivegas", caster) > 0 && stage.hadMobEffect(near, "world_combat:status/corroded");
        }, function () {
            stage.expect(stage.casts("corrosivegas", caster) > 0, "队友离开后腐蚀气体被放出来了");
            stage.expect(stage.hadMobEffect(near, "world_combat:status/corroded"),
                "雾里至少一个目标身上出现了沾酸的共享身份");
            stage.expect(stage.heldItem(near) === "minecraft:iron_sword", "corrosion retained the real sword instead of deleting it");
            stage.expect(stage.heldDamage(near) === 15, "the native iron sword lost six percent of its 250 durability");
            stage.note("Component preservation, exact wear, stale refusal and the one-durability floor are checked by the shared equipment mechanism regression.",
                { allyHeld: stage.heldItem(ally) });
            stage.done();
        }, "队友离开后喷酸");
    });
});

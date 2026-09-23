Smoke.scenario("corrosivegas", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 8], "minecraft:stone");
    var caster = stage.pokemon({ species: "Skuntank", level: 34, moves: ["corrosivegas"], at: [0, 0, 0] });
    var near = stage.mob({ type: "minecraft:pillager", at: [2, 0, 0] });
    stage.noai(near);
    stage.command("item replace entity " + near.ref.split("/")[0] + " weapon.mainhand with minecraft:iron_sword");
    stage.hostile(caster, near);
    stage.until(1000, function () {
        return stage.casts("corrosivegas", caster) > 0
            && stage.hadMobEffect(near, "world_combat:status/corroded");
    }, function () {
        stage.expect(stage.casts("corrosivegas", caster) > 0, "腐蚀气体被放出来了");
        stage.expect(stage.hadMobEffect(near, "world_combat:status/corroded"),
            "雾里至少一个目标身上出现了沾酸的共享身份");
        stage.expect(stage.heldItem(near) === "minecraft:iron_sword", "corrosion retained the real sword instead of deleting it");
        stage.expect(stage.heldDamage(near) === 15, "the native iron sword lost six percent of its 250 durability");
        stage.note("The ordinary sword holder received corrosion. Component preservation, exact wear, stale refusal and the one-durability floor are checked by the shared equipment mechanism regression.");
        stage.done();
    }, "腐蚀气体罩住了一片");
});

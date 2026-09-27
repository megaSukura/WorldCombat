// AI 自行架板；原生生物在实际窗口内接受两次可比较的近战伤害。
Smoke.scenario("quickguard", function (stage) {
    stage.weather("clear"); stage.time("day");
    var caster = stage.pokemon({ species: "shieldon", level: 34, moves: ["quickguard"], at: [-2, 0, 0] });
    var ally = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0] });
    stage.team("quick", [caster, ally]);
    stage.hostile(caster, foe); stage.hostile(ally, foe);
    stage.noai(ally, foe);
    function hit(): void {
        stage.command("damage " + String(ally.ref).split("/")[0] + " 10 minecraft:mob_attack by " + String(foe.ref).split("/")[0]);
    }
    stage.until(900, function () {
        return stage.casts("quickguard", caster) > 0 && stage.hasMobEffect(ally, "world_combat:status/quickguard");
    }, function () {
        stage.setPp(caster, "quickguard", 0);
        stage.expect(stage.hasMobEffect(caster, "world_combat:status/quickguard"), "caster received its own short guard");
        stage.expect(stage.hasMobEffect(ally, "world_combat:status/quickguard"), "ordinary allied body received the guard");
        var before = ally.health(); hit();
        stage.after(1, function () {
            var first = before - ally.health();
            stage.expect(Math.abs(first - 4) < 0.05, "first native melee loses four HP after sixty percent reduction");
            stage.expect(!stage.hasMobEffect(ally, "world_combat:status/quickguard"), "first direct hit consumes only this ally's guard");
            stage.expect(stage.hasMobEffect(caster, "world_combat:status/quickguard"), "another ally's guard survives the first body's hit");
            stage.after(20, function () {
                var next = ally.health(); hit();
                stage.after(1, function () {
                    var second = next - ally.health();
                    stage.expect(Math.abs(second - 10) < 0.05, "later native melee loses the full ten HP");
                    stage.expect(!stage.hasMobEffect(caster, "world_combat:status/quickguard"), "unused caster guard expires on its native clock");
                    stage.note("原生铁傀儡首次真实近战减免，第二次全额；每个队友独立消费。短板形状与抢拍手感由玩家体验。", { first: first, second: second, tick: stage.tick() });
                    stage.done();
                });
            });
        });
    }, "quick guard covers the nearby ordinary ally");
});

/**
 * 抛物面充电 / paraboliccharge 的可执行设计说明。
 *
 * 场面：晴天白天、铺好的平地。只会抛物面充电的皮卡丘（pikachu，攻击性电系，fixture 用途）站在中央，
 *   两侧各一只只会「跃起」的小拉达（rattata，伤害不了施法者）当靶子；先把施法者用 /damage 压到约七成。
 *
 * 必然事实：本招被提交过；至少一个目标受到过范围电击伤害；施法者从这一发回复过生命（高于压血后的基线）。
 *   实际电到几个目标、暴击与每个目标各自的汲取量是随机／位置项，写进 note 供读轨迹判断。
 */
Smoke.scenario("paraboliccharge", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "pikachu", level: 35, moves: ["paraboliccharge"], at: [0, 0, 0] });
    var left = stage.pokemon({ species: "rattata", level: 25, moves: ["splash"], at: [-2, 0, -0.5] });
    var right = stage.pokemon({ species: "rattata", level: 25, moves: ["splash"], at: [2, 0, 0.5] });

    var maximum = 0, baseline = 0, wounded = false, tries = 0;
    function wound(): void {
        if (wounded || !caster.alive()) return;
        if (maximum <= 0) maximum = caster.health();
        if (maximum <= 0) return;
        if (caster.health() <= maximum * 0.7 || tries >= 24) { baseline = caster.health(); wounded = true; return; }
        tries++;
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..1,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.08)) + " minecraft:generic");
        stage.after(6, wound);
    }
    stage.after(5, wound);

    stage.until(300, function () { return wounded; }, function () {
        stage.hostile(caster, left);
        stage.hostile(caster, right);
        stage.until(900, function () {
            return stage.casts("paraboliccharge", caster) > 0
                && (stage.damageTo(left) + stage.damageTo(right)) > 0 && caster.health() > baseline + 2;
        }, function () {
            stage.expect(stage.casts("paraboliccharge", caster) > 0, "parabolic charge was cast");
            stage.expect((stage.damageTo(left) + stage.damageTo(right)) > 0, "the dish shocked at least one target");
            stage.expect(caster.health() > baseline + 2, "the user regained health from the dish");
            stage.note("每一记伤害各自走共享 drain；以自身为中心的半径与目标数决定总回血，暴击与命中率不写死。",
                { casts: stage.casts("paraboliccharge", caster), damageLeft: Math.round(stage.damageTo(left) * 10) / 10,
                  damageRight: Math.round(stage.damageTo(right) * 10) / 10, woundedHealth: Math.round(baseline * 10) / 10,
                  casterHealth: Math.round(caster.health() * 10) / 10 });
            stage.done();
        }, "the dish lands and heals");
    }, "caster is wounded below 70%");
});

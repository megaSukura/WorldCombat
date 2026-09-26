/**
 * 分担痛楚的可执行设计说明：一只被预先压到约四成的高生命宝可梦（卡比兽）只带本招，对一个生命更高的无害对手
 * （吉利蛋，只会跃起）开战。
 *
 * 为什么先压血：这招的 AI 按「实际能拿回多少治疗」出手——自己满血、没有生命空位时，即使对手血更多也不主动牵线。
 * 把施法者压出空位、又停在共享的撤退线以上（约四成），对手生命更高，抽高补低就是净赚，AI 才会在射程内尽早牵线。
 *
 * 必然事实：本招被提交过；对手被实际抽走了一段生命；施法者从这一抽里回复了生命（高于压血后的基线）。
 *   具体分到多少取决于双方当前生命、取整与原生伤害/治疗的接受情况，写进 note 供读轨迹判断；不写随机断言。
 */
Smoke.scenario("painsplit", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "snorlax", level: 30, moves: ["painsplit"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "chansey", level: 30, moves: ["splash"], at: [2, 0, 0] });

    var maximum = 0, baseline = 0, wounded = false, tries = 0;
    function wound(): void {
        if (wounded || !caster.alive()) return;
        if (maximum <= 0) maximum = caster.health();
        if (maximum <= 0) return;
        if (caster.health() <= maximum * 0.4 || tries >= 24) { baseline = caster.health(); wounded = true; return; }
        tries++;
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.1)) + " minecraft:generic");
        stage.after(6, wound);
    }
    stage.after(5, wound);

    stage.until(300, function () { return wounded; }, function () {
        stage.hostile(caster, foe);
        stage.until(900, function () {
            return stage.casts("painsplit", caster) > 0 && stage.damageTo(foe) > 0 && caster.health() > baseline + 2;
        }, function () {
            stage.expect(stage.casts("painsplit", caster) > 0, "分担痛楚被放出来了");
            stage.expect(stage.damageTo(foe) > 0, "生命更高的一方被实际抽走了一段生命");
            stage.expect(caster.health() > baseline + 2, "施法者按实际失血回复了生命");
            stage.note("先抽高血一方（这里是对手），读回实际失血，再按这份实际失血补低血一方（这里是自己）；具体数值随双方生命与取整变化。",
                { casts: stage.casts("painsplit", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                  woundedHealth: Math.round(baseline * 10) / 10, casterHealth: Math.round(caster.health() * 10) / 10,
                  foeHealth: Math.round(foe.health() * 10) / 10 });
            stage.done();
        }, "分担痛楚抽高补低");
    }, "施法者被压到四成");
});

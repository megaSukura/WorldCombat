/**
 * 地球上投的可执行设计说明。
 *
 * 场面：一只只会地球上投的精灵（腕力，30 级）面对 2 格外一只学不会任何招式、只当沙包的精灵（果然翁，30 级）。
 * 抓取判定 100 必然抓住，伤害恒为等级；果然翁生命有一百多，挨下这一记还会被甩出去，位移读数干净。
 * 必然事实：本招被提交过；果然翁受到过等级伤害；它被这一甩移动过。
 * 甩出的落点与用户是否被还手都随走位变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("seismictoss", function (stage) {
    stage.time("night");
    var thrower = stage.pokemon({ species: "machop", level: 30, moves: ["seismictoss"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "wobbuffet", level: 30, moves: ["splash"], at: [1, 0, 0] });
    stage.hostile(thrower, foe);
    stage.until(900, function () {
        return stage.casts("seismictoss", thrower) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("seismictoss", thrower) > 0, "machop committed seismic toss");
            stage.expect(stage.damageTo(foe) > 0, "seismic toss dealt level damage");
            stage.expect(stage.travelled(foe) > 0.5, "the target was thrown and moved");
            stage.note("seismic toss deals the user's level (30) regardless of the target's defence; the throw then launches the target. Variable: whether the trace is blocked by terrain, the landing point and how far the 154-HP punchbag flies.", {
                casts: stage.casts("seismictoss", thrower),
                damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
                foeAlive: foe.alive(), foeHealth: Math.round(foe.health() * 10) / 10,
                throwerTravelled: Math.round(stage.travelled(thrower) * 10) / 10
            });
            stage.done();
        });
    }, "seismic toss is cast, damages and throws the target within 45 s");
});

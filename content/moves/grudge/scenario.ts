// 怨念的可执行设计说明。
// 场面：一只只会怨念的卡比兽先把自己打到立怨阈值以下的残血，逼它立下怨念；7 格外一只只会再来一次的怪力
//   看到卡比兽刚立怨，就把那一手点名出去——于是凶手「最后使用的招式」是再来一次（一个不会在凶手身上
//   留下阻断身份的目标招）。等两者都出手后，用指令把卡比兽留在 1 点生命，再以怪力为来源补上致命一击。
//   这一击以怪力为来源、正好打光使用者剩下的 1 点生命：怨念的偿还路径完全确定。
//   之后放一只新的小精灵当「刚出过手的目标」，并把它的残血逼到立怨；若怪力的再来一次 PP 已被掏空，
//   它在 200 刻里一次也点不出来。
// 必然事实：怨念被提交过；怨念作为真实 MobEffect 落到使用者身上并带共享身份；使用者倒下后凶手无法再使出那一招。
// 本组的私有装配只装载这四招，所以凶手与替补目标都用本组的招。
Smoke.scenario("grudge", function (stage) {
    var caster = stage.pokemon({ species: "snorlax", level: 30, moves: ["grudge"], at: [0, 0, 0] });
    var killer = stage.pokemon({ species: "Machoke", level: 34, moves: ["encore"], at: [7, 0, 0] });
    function plain(ref: string): string { return String(ref).split("/")[0]; }
    function jab(): void {
        if (!caster.alive() || !killer.alive()) return;
        stage.command("damage " + plain(killer.ref) + " 1 minecraft:magic by " + plain(caster.ref));
        stage.after(40, jab);
    }
    stage.hostile(caster, killer);
    stage.after(6, jab);
    stage.after(30, function () {
        stage.command("damage " + plain(caster.ref) + " " + Math.max(1, Math.floor(caster.health() * 0.65)) + " minecraft:magic");
    });
    stage.until(1500, function () {
        return stage.casts("grudge", caster) > 0 && stage.casts("encore", killer) > 0;
    }, function () {
        var reduce = Math.floor(caster.health() - 1);
        if (reduce > 0) stage.command("damage " + plain(caster.ref) + " " + reduce + " minecraft:magic");
        // 这一击以怪力为来源、正好打光使用者剩下的 1 点生命：致命一击归凶手。
        stage.command("damage " + plain(caster.ref) + " 1 minecraft:magic by " + plain(killer.ref));
        stage.until(120, function () { return !caster.alive(); }, function () {
            stage.expect(stage.casts("grudge", caster) > 0, "grudge was committed");
            stage.expect(stage.hadMobEffect(caster, "world_combat:grudge_watch"), "the grudge exists as a real MobEffect");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/grudge"), "the grudge carries the shared identity");
            stage.expect(!caster.alive(), "the watching user was brought down by the foe");
            stage.after(20, function () {
                var biter = stage.pokemon({ species: "snorlax", level: 30, moves: ["grudge"], at: [0, 0, 4] });
                stage.command("damage " + plain(biter.ref) + " " + Math.max(1, Math.floor(biter.health() * 0.65)) + " minecraft:magic");
                var rehostile = function (): void {
                    if (!killer.alive() || !biter.alive()) return;
                    stage.hostile(killer, biter);
                    stage.command("damage " + plain(biter.ref) + " 1 minecraft:magic by " + plain(killer.ref));
                    stage.after(40, rehostile);
                };
                rehostile();
                stage.until(400, function () { return stage.casts("grudge", biter) > 0; }, function () {
                    var frozen = stage.casts("encore", killer);
                    stage.after(200, function () {
                        stage.expect(stage.casts("encore", killer) <= frozen, "the move that knocked the user out could not be used again");
                        stage.note("the killer's lastMove slot is zeroed through CobblemonCombat.pp; the killer is given a fresh readable target so the emptied move is what stays silent.", {
                            grudgeCasts: stage.casts("grudge", caster), encoresAtDrain: frozen,
                            encoresLater: stage.casts("encore", killer), biterGrudge: stage.casts("grudge", biter)
                        });
                        stage.done();
                    });
                }, "the fresh target has acted so the killer has something to name");
            });
        }, "the watching user falls to the foe");
    }, "the grudge is up and the killer has named a move");
});

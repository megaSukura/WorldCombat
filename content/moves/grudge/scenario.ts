// 怨念的可执行设计说明。
// 场面：一只只会怨念的卡比兽对 9 格外一只只会再来一次的怪力。先把卡比兽打到立怨阈值以下的残血逼它立下怨念；
//   怨念确认在手后先用同一凶手的一次非致命攻击验证「不索债」，再把它留到 1 点生命，注入带 move:"encore" 的致命伤害——
//   怨念按致死回执与真实付 PP 的原槽结账，掏空凶手再来一次的 PP。之后放一只新目标，逼凶手再想出手；
//   若它的再来一次 PP 已被掏空，200 刻里一次也点不出来。
// 必然事实：怨念被提交过；怨念作为真实 MobEffect 落到使用者身上并带共享身份；非致命不索债；
//   使用者倒下后凶手致命招的真实 PP 槽被清零。
// 本组的私有装配只装载这四招，所以凶手与替补目标都用本组的招。
Smoke.scenario("grudge", function (stage) {
    var caster = stage.pokemon({ species: "snorlax", level: 30, moves: ["grudge"], at: [0, 0, 0] });
    // 怨念是牺牲换资源：AI 只在队伍仍能接战时选它，所以给它留一名在场的队友。
    var ally = stage.pokemon({ species: "snorlax", level: 30, moves: [], at: [-2, 0, 2] });
    var killer = stage.pokemon({ species: "Machoke", level: 34, moves: ["encore"], at: [9, 0, 0] });
    function plain(ref: string): string { return String(ref).split("/")[0]; }
    stage.team("grudge", [caster, ally]);
    stage.hostile(caster, killer);
    stage.after(30, function () {
        stage.command("damage " + plain(caster.ref) + " " + Math.max(1, Math.floor(caster.health() * 0.65)) + " minecraft:magic");
    });
    stage.until(1200, function () {
        return stage.casts("grudge", caster) > 0;
    }, function () {
        // 非致命一击不该索债：以同一凶手、同一招名的普通攻击试探，先证明它不动凶手的 PP。
        var beforePp = stage.pp(killer, "encore");
        stage.hurt(caster, 1, "minecraft:generic", { source: killer, metadata: { move: "encore" } });
        stage.after(10, function () {
            stage.expect(stage.pp(killer, "encore") === beforePp, "a non-lethal blow did not settle the grudge");
            // 立怨在手时立刻结账：把使用者留到 1 点生命，隔开无敌帧后，再注入带招名的致命一击。
            var reduce = Math.floor(caster.health() - 1);
            if (reduce > 0) stage.command("damage " + plain(caster.ref) + " " + reduce + " minecraft:magic");
            stage.after(15, function () {
                stage.hurt(caster, Math.max(5, Math.ceil(caster.health()) + 5), "minecraft:generic", { source: killer, metadata: { move: "encore" } });
                stage.until(120, function () { return !caster.alive(); }, function () {
                    stage.expect(stage.casts("grudge", caster) > 0, "grudge was committed");
                    stage.expect(stage.hadMobEffect(caster, "world_combat:grudge_watch"), "the grudge exists as a real MobEffect");
                    stage.expect(stage.hadMobEffect(caster, "world_combat:status/grudge"), "the grudge carries the shared identity");
                    stage.expect(!caster.alive(), "the watching user was brought down by the foe");
                    // 借招／致命回执都按真实付 PP 的槽结账：凶手那一手被清空。
                    stage.expect(stage.pp(killer, "encore") === 0, "the killing move's real PP slot was drained");
                    var frozen = stage.casts("encore", killer);
                    stage.after(20, function () {
                        var biter = stage.pokemon({ species: "snorlax", level: 30, moves: ["grudge"], at: [0, 0, 4] });
                        // 队友同在，替补目标才具备「队伍仍能接战」的立怨条件。
                        stage.team("grudge", [biter]);
                        stage.command("damage " + plain(biter.ref) + " " + Math.max(1, Math.floor(biter.health() * 0.65)) + " minecraft:magic");
                        var rehostile = function (): void {
                            if (!killer.alive() || !biter.alive()) return;
                            stage.hostile(killer, biter);
                            stage.command("damage " + plain(biter.ref) + " 1 minecraft:magic by " + plain(killer.ref));
                            stage.after(40, rehostile);
                        };
                        rehostile();
                        stage.until(400, function () { return stage.casts("grudge", biter) > 0; }, function () {
                            stage.after(200, function () {
                                stage.expect(stage.casts("encore", killer) <= frozen, "the move that knocked the user out could not be used again");
                                stage.note("the killer's encore slot is zeroed through CobblemonCombat.pp, attributed by the killing receipt's move id; the killer is given a fresh readable target so the emptied move is what stays silent.", {
                                    grudgeCasts: stage.casts("grudge", caster), encoresAtDrain: frozen,
                                    encoresLater: stage.casts("encore", killer), biterGrudge: stage.casts("grudge", biter)
                                });
                                stage.done();
                            });
                        }, "the fresh target has acted so the killer has something to name");
                    });
                }, "the watching user falls to the foe");
            });
        });
    }, "the grudge is up");
});

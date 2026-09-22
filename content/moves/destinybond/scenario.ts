// 同命的可执行设计说明。
// 场面：一只只会同命的卡比兽对 9 格外一只只会撞击的怪力；先用指令把卡比兽打到远低于 ai.threshold 的残血，
//   逼它系线；一条每 40 刻的轻伤害把双方锁在「对方刚打过我」的威胁判定里，怪力靠近后一记撞击把它打倒，
//   命线绷断，凶手应被一起拖走。
// 必然事实：同命被提交过；命线作为真实 MobEffect 落到使用者身上并带共享身份；使用者倒下后凶手也倒下。
// 随机结果：系线与致命一击之间的先后、倒下用了多久写进 note 供读轨迹判断。
Smoke.scenario("destinybond", function (stage) {
    var caster = stage.pokemon({ species: "snorlax", level: 35, moves: ["destinybond"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "machamp", level: 45, moves: ["tackle"], at: [9, 0, 0] });
    function engage(): void {
        if (!caster.alive() || !foe.alive()) return;
        stage.command("damage " + String(foe.ref).split("/")[0] + " 1 minecraft:magic by " + String(caster.ref).split("/")[0]);
        stage.command("damage " + String(caster.ref).split("/")[0] + " 1 minecraft:magic by " + String(foe.ref).split("/")[0]);
        stage.after(40, engage);
    }
    stage.hostile(caster, foe);
    stage.after(6, engage);
    stage.after(30, function () {
        stage.command("damage " + String(caster.ref).split("/")[0] + " " + Math.max(1, Math.floor(caster.health() * 0.85)) + " minecraft:magic");
    });
    stage.until(1600, function () {
        return stage.casts("destinybond", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/destiny_bond")
            && !caster.alive();
    }, function () {
        stage.expect(stage.casts("destinybond", caster) > 0, "destinybond was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:destiny_bond"), "the bond exists as a real MobEffect");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/destiny_bond"), "the bond carries the shared identity");
        stage.expect(!caster.alive(), "the bonded user was brought down by the foe");
        stage.after(10, function () {
            stage.expect(!foe.alive(), "the killer was dragged down with it");
            stage.note("the lethal blow is recognised at damage_incoming and settled at damage_applied once data.after <= 0; the retaliation takes the killer's whole remaining health. Only a foe's blow counts - an environmental finish leaves the bond unpaid.", {
                casts: stage.casts("destinybond", caster), casterAlive: caster.alive(), foeAlive: foe.alive(), foeHealth: foe.health()
            });
            stage.done();
        });
    }, "the bonded user falls to the foe");
});

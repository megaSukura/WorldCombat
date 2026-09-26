// 同命的可执行设计说明。
// 场面：一只只会同命的卡比兽对 9 格外一只只会撞击的怪力；先用指令把卡比兽打到远低于 ai.threshold 的残血，
//   逼它系线；一条每 40 刻的轻伤害把双方锁在「对方刚打过我」的威胁判定里。命线确认在手后，立刻把卡比兽留到
//   1 点生命，并以怪力为来源注入一击致命伤害——命线绷断，凶手应被一起拖走。
// 必然事实：同命被提交过；命线作为真实 MobEffect 落到使用者身上并带共享身份；使用者倒下后凶手也倒下。
// 随机结果：系线用了多久、致命一击与牵命之间隔了几刻写进 note 供读轨迹判断。
Smoke.scenario("destinybond", function (stage) {
    function plain(ref: string): string { return String(ref).split("/")[0]; }
    var caster = stage.pokemon({ species: "snorlax", level: 35, moves: ["destinybond"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "machamp", level: 45, moves: ["tackle"], at: [9, 0, 0] });
    var engaging = true;
    function engage(): void {
        if (!engaging || !caster.alive() || !foe.alive()) return;
        stage.command("damage " + plain(foe.ref) + " 1 minecraft:magic by " + plain(caster.ref));
        stage.command("damage " + plain(caster.ref) + " 1 minecraft:magic by " + plain(foe.ref));
        stage.after(40, engage);
    }
    stage.hostile(caster, foe);
    stage.after(6, engage);
    stage.after(30, function () {
        stage.command("damage " + plain(caster.ref) + " " + Math.max(1, Math.floor(caster.health() * 0.85)) + " minecraft:magic");
    });
    stage.until(1400, function () {
        return stage.casts("destinybond", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/destiny_bond");
    }, function () {
        // 命线在手时立刻结账：先停下互击，把使用者留到 1 点生命，隔开无敌帧后，再以怪力为来源注入致命一击。
        engaging = false;
        var reduce = Math.floor(caster.health() - 1);
        if (reduce > 0) stage.command("damage " + plain(caster.ref) + " " + reduce + " minecraft:magic");
        stage.after(15, function () {
        // 使用者可能已被另一击打倒（命线已结账）；只有在还活着时才补上带来源的致命一击。
        if (caster.alive()) stage.hurt(caster, Math.max(5, Math.ceil(caster.health()) + 5), "minecraft:generic", { source: foe });
        stage.until(120, function () { return !caster.alive(); }, function () {
            stage.expect(stage.casts("destinybond", caster) > 0, "destinybond was committed");
            stage.expect(stage.hadMobEffect(caster, "world_combat:destiny_bond"), "the bond exists as a real MobEffect");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/destiny_bond"), "the bond carries the shared identity");
            stage.expect(!caster.alive(), "the bonded user was brought down by the foe");
            stage.after(10, function () {
                stage.expect(!foe.alive(), "the killer was dragged down with it");
                stage.note("the lethal blow is recognised at damage_incoming and settled at damage_applied once data.after <= 0; one world.health attempt takes the killer's remaining health, and only a foe's blow counts - an environmental finish leaves the bond unpaid.", {
                    casts: stage.casts("destinybond", caster), casterAlive: caster.alive(), foeAlive: foe.alive(), foeHealth: foe.health()
                });
                stage.done();
            });
        }, "the bonded user falls to the foe");
        });
    }, "the bond is armed");
});

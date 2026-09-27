// 灭亡之歌的可执行设计说明。
// 场面：一只 50 级卡比兽在原点起唱。2 格外的铁傀儡 listener 留在歌里，-4 格外、隔一堵墙的铁傀儡 behind 只按圈内距离
//   入名单（验证声音穿掩体），3 格外的蜘蛛 runner 在起唱后立刻被传送出歌域、再在末拍前传回圈内。
// 必然事实：灭亡之歌被提交过；施法者、留场者、墙后对象都带过真实 MobEffect 与共享身份 world_combat:status/perish_song；
//   出域的 runner 立刻脱出名单、回来也不复得且从不受伤；留场者在末拍各收一笔固定伤害（不是按生命归一化）；
//   施法者自己也收同一笔，且仍活着；末拍走原生伤害链；伪造的孤立状态自然到期不再致死；杀死施法者整首歌作废、不结算。
let perishActionDamage: { [ref: string]: number } = Object.create(null);
WorldCombat.on("world_combat:checks/perish_action", "world_combat:damage_applied", "", event => {
    const data = JSON.parse(event.data()), target = event.target();
    if (!target || data.move !== "perishsong" || !(data.actual > 0)) return;
    const ref = String(target.ref());
    perishActionDamage[ref] = (perishActionDamage[ref] || 0) + data.actual;
});
Smoke.scenario("perishsong", function (stage) {
    perishActionDamage = Object.create(null);
    function plain(ref: string): string { return String(ref).split("/")[0]; }
    function damageToRatio(actor: { health(): number }, fraction: number): number {
        return Math.max(1, Math.floor(actor.health() * fraction));
    }
    function judged(actor: Smoke.Actor): number {
        return Object.keys(perishActionDamage).filter(ref => ref.indexOf(actor.ref) === 0)
            .reduce((sum, ref) => sum + perishActionDamage[ref], 0);
    }

    var singer = stage.pokemon({ species: "snorlax", level: 50, moves: ["perishsong"], at: [0, 0, 0] });
    // 隔一堵墙的听者：歌声穿掩体，只按圈内距离判定。
    stage.fill([-2, 0, -2], [-2, 3, 2], "minecraft:stone");
    var stay = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    var behind = stage.mob({ type: "minecraft:iron_golem", at: [-4, 0, 0] });
    var runner = stage.mob({ type: "minecraft:spider", at: [3, 0, 0] });
    var ally = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 3] });
    stage.team("perish-friends", [singer, ally]);
    stage.hostile(singer, stay);
    stage.hostile(singer, runner);
    stage.noai(stay, behind, runner, ally);
    stage.after(2, function () { stage.prefer(singer, "perishsong", { ai: { threshold: 0.9, maxChase: 16 } }); });
    stage.after(20, function () { stage.command("damage " + plain(singer.ref) + " " + damageToRatio(singer, 0.15) + " minecraft:magic"); });

    stage.until(1200, function () {
        return stage.casts("perishsong", singer) > 0
            && stage.hasMobEffect(singer, "world_combat:status/perish_song")
            && stage.hasMobEffect(stay, "world_combat:status/perish_song")
            && stage.hasMobEffect(behind, "world_combat:status/perish_song")
            && stage.hasMobEffect(runner, "world_combat:status/perish_song");
    }, function () {
        // 起唱后立刻把 runner 送出歌域；离开即脱出名单。
        stage.command("tp " + plain(runner.ref) + " ~30 ~ ~");
        stage.until(160, function () { return !stage.hasMobEffect(runner, "world_combat:status/perish_song"); }, function () {
            // 末拍之前把它传回圈内：出域过就不再复得资格。
            stage.command("tp " + plain(runner.ref) + " ~-30 ~ ~");
            stage.until(900, function () { return judged(stay) > 0 && judged(singer) > 0; }, function () {
                stage.expect(stage.casts("perishsong", singer) > 0, "灭亡之歌被提交过");
                stage.expect(stage.damageTo(stay) > 0, "留在歌域里的目标收到了末拍有限伤害");
                stage.expect(judged(singer) > 0, "施法者自己同fixed原生action路径收到了末拍，未把布景扣血当结算");
                stage.expect(judged(ally) > 0 && Math.abs(judged(ally) - judged(stay)) < 0.01, "同体型友敌通过同一fixed路径支付相同实际伤害");
                stage.expect(stage.damageTo(behind) > 0, "声音穿过了墙：墙后目标也被结算");
                stage.expect(stage.damageTo(runner) === 0, "出域再回来的目标全程没有被结算");
                stage.expect(!stage.hasMobEffect(stay, "world_combat:status/perish_song"), "结算后留场者的本曲标记被清掉");
                stage.expect(stage.damageEvents("world_combat.action").length > 0, "末拍走的是原生伤害链");
                // 清掉第一只歌者，避免它之后干涉伪造状态与第二场。
                stage.command("kill " + plain(singer.ref));
                // 伪造的孤立状态自然到期不伤：直接给 runner 挂一分钟的 perish_song 再等它到期。
                stage.command("effect give " + plain(runner.ref) + " world_combat:perish_song 1 0");
                stage.after(70, function () {
                    stage.expect(runner.alive(), "伪造的孤立状态到期没有致死");
                    stage.expect(stage.damageTo(runner) === 0, "伪造的孤立状态到期没有造成伤害");
                    secondSong();
                });
            }, "留场目标在末拍被结算");
        }, "runner 在离开歌域后立刻脱出名单");
    }, "起唱同时点名施法者、留场者与墙后目标");

    function secondSong(): void {
        var singer2 = stage.pokemon({ species: "snorlax", level: 50, moves: ["perishsong"], at: [12, 0, 0] });
        var listener2 = stage.mob({ type: "minecraft:iron_golem", at: [14, 0, 0] });
        stage.hostile(singer2, listener2);
        stage.noai(listener2);
        stage.after(2, function () { stage.prefer(singer2, "perishsong", { ai: { threshold: 0.9, maxChase: 16 } }); });
        stage.after(20, function () { stage.command("damage " + plain(singer2.ref) + " " + damageToRatio(singer2, 0.15) + " minecraft:magic"); });
        stage.until(1200, function () {
            return stage.casts("perishsong", singer2) > 0 && stage.hasMobEffect(listener2, "world_combat:status/perish_song");
        }, function () {
            stage.command("kill " + plain(singer2.ref));
            stage.until(200, function () { return !stage.hasMobEffect(listener2, "world_combat:status/perish_song"); }, function () {
                stage.expect(stage.damageTo(listener2) === 0, "杀死施法者后整首歌作废，留场者没有被结算");
                stage.note("起唱固定歌域、声音穿掩体只按圈内距离；名单在起唱那刻定下，出域立即永久脱出；施法者占用动作原地唱完三拍，末拍对仍带着本曲标记的对象走原生伤害链结算一笔有限固定伤害，先他人后自己，友敌与自身同规则；取消／换下／死亡终止整首歌，MobEffect 到期或移除只做清理，孤立状态不会致死。",
                    { casts: stage.casts("perishsong"), singerFelled: !singer.alive(), stayAlive: stay.alive(), behindAlive: behind.alive(),
                        runnerAlive: runner.alive(), runnerDamage: stage.damageTo(runner),
                        stayDamage: Math.round(stage.damageTo(stay) * 10) / 10, singerDamage: Math.round(stage.damageTo(singer) * 10) / 10,
                        listener2Damage: stage.damageTo(listener2), actionReceipts: stage.damageEvents("world_combat.action").length });
                fatalFinale();
            }, "杀死歌者后第二场的标记被清掉");
        }, "第二只歌者起唱并挂上标记");
    }

    function fatalFinale(): void {
        const caster = stage.pokemon({ species: "snorlax", level: 50, moves: ["perishsong"], at: [25, 0, 0] });
        const listener = stage.mob({ type: "minecraft:iron_golem", at: [27, 0, 0] });
        stage.hostile(caster, listener); stage.noai(listener);
        stage.after(2, () => stage.prefer(caster, "perishsong", { ai: { threshold: 0.9, maxChase: 16 } }));
        stage.after(20, () => stage.command("damage " + plain(caster.ref) + " " + damageToRatio(caster, .15) + " minecraft:magic"));
        stage.until(1200, () => stage.casts("perishsong", caster) > 0 && stage.hasMobEffect(listener, "world_combat:status/perish_song"), () => {
            // Lower HP only after the valid AI commitment; the finale itself must be the fatal action receipt.
            stage.command("damage " + plain(caster.ref) + " " + Math.max(0, caster.health() - 1) + " minecraft:generic_kill");
            stage.until(240, () => !caster.alive() && judged(listener) > 0, () => {
                stage.expect(judged(caster) > 0, "致死的自身末拍走action固定伤害回执");
                stage.expect(judged(listener) > 0, "自身致死前其他名单成员已结算");
                stage.expect(!stage.hasMobEffect(listener, "world_combat:status/perish_song"), "致死末拍后名单载体收回");
                stage.after(8, () => { stage.note("致死自身末拍后由短期独立观察者交付真实回执；动作不再触失效scope。", { self: judged(caster), listener: judged(listener) }); stage.done(); });
            }, "致死末拍与其他受体同一固定伤害路径完成");
        }, "致死场景先由真实AI起唱");
    }
});

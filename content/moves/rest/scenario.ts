/**
 * 睡觉 / Rest —— 可执行设计说明。
 *
 * 一句话：在安全的窗口里就地睡下，睡满整段才回满缺失生命、清掉异常并留下「神清气爽」；AI 只在自身生命低于
 *   ai.healBelow（默认 0.6）、最近 30 刻没挨打、且视野里没有活着的敌人进入 ai.safeDistance（默认 6 格）时
 *   才把这招提出来。所以场面必须先让施术者受伤，再给它一块没有威胁的地方，睡觉才会发生。
 *
 * 场面：晴天白天、开阔平地。只会睡觉的呆壳兽（slowpoke，会学这招的常见物种；技能表只给这一招）站在场地
 *   一侧；对面 16 格外站一只只会撞击的小拉达（rattata，20 级）。施术者先由服务端 /damage 分小步压到自身最大
 *   生命约 55%（每步约 8%），把 AI 的睡眠阈值稳稳跨过；敌人还在安全距离之外，AI 会就地睡下。先不宣战：让
 *   「安全窗口里的完整一觉」这一幕稳定跑完。
 *
 * 必然事实：施术者提交过睡觉；施术者身上出现过共享睡眠 world_combat:status/sleep；在无干扰窗口里睡满后，
 *   沉睡档必定给出 world_combat:refreshed（execute 里 complete && !shortNap 才给），不受随机数影响。睡满回血、
 *   敌人何时上前、是否只睡到一半被惊醒都属于位置与时机的随机项，写进 note 而不作断言。
 *
 * 共享前置：私有装配只注册本单元的动作，目标的小拉达「撞击」不在装配里，所以它不会真的出招、也不会把施术者
 *   打醒；这一层只能由完整装配验证。
 */
Smoke.scenario("rest", function (stage) {
    stage.weather("clear");
    stage.time("day");

    // 施术者只带睡觉这一招；野生 AI 没有别的动作可选。
    var caster = stage.pokemon({ species: "slowpoke", level: 30, moves: ["rest"], at: [-3, 0, 0] });
    // 目标会还手（撞击），先站在安全距离之外，睡满后再宣战把交火留在轨迹里。
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [16, 0, 0] });

    // 分小步把施术者压到睡眠阈值以下；停在 55% 后用 settled 保证不再补刀——睡下之后再落一刀会把这一觉惊醒。
    var maximum = 0, settled = false;
    function wound(): void {
        if (settled || !caster.alive()) return;
        if (maximum <= 0) maximum = caster.health();
        if (maximum <= 0) return;
        if (caster.health() <= maximum * 0.55) { settled = true; return; }
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.08)) + " minecraft:generic");
        stage.after(10, wound);
    }
    stage.after(5, wound);

    stage.until(800, function () {
        return stage.casts("rest", caster) >= 1 && stage.hadMobEffect(caster, "world_combat:status/sleep");
    }, function () {
        stage.expect(stage.casts("rest", caster) >= 1, "the wounded slowpoke committed rest in a safe window");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/sleep"), "sleep landed on the caster through the shared identity world_combat:status/sleep");
        stage.after(400, function () {
            stage.expect(stage.hadMobEffect(caster, "world_combat:refreshed"), "slept through the whole window and left refreshed");
            stage.hostile(caster, foe);
            stage.after(300, function () {
                stage.note("睡满回血、敌人上前打断、被惊醒的比例结算都属于位置与时机的随机项：睡满（execute 的 ratio>=0.98 且沉睡档）会回复全部缺失生命并给 refreshed；被任何伤害提前惊醒只按已睡比例回复、并追加 minecraft:slowness。本装配里目标的小拉达只带撞击、其招式单元不在私有装配，所以它不会真的打醒施术者。", {
                    casterCasts: stage.casts("rest", caster),
                    sleptEver: stage.hadMobEffect(caster, "world_combat:status/sleep"),
                    refreshedEver: stage.hadMobEffect(caster, "world_combat:refreshed"),
                    casterHealth: Math.round(caster.health() * 10) / 10,
                    damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                    foeCasts: stage.casts("tackle", foe),
                    casterAlive: caster.alive(),
                    tick: stage.tick()
                });
                stage.note("舞台现象：stage.pokemon 不设 persistence，两只野生宝可梦在无玩家附近时约 650 刻自然消失（没有 body_died 事件），所以末次读数里的 alive=false 与招式无关；判断睡觉本身请看 casts / sleptEver / refreshedEver。");
                stage.done();
            });
        });
    }, "rest is cast in a safe window within 40 s");
});

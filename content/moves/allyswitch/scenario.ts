/**
 * 交换场地 / allyswitch 的可执行设计说明。
 *
 * 场面：一只只会「交换场地」的凯西（Abra，32 级）与一只伊布队友同队、相隔 3 格；斜前方是一只敌对的小拉达
 *   （双方互相开战，让施法者眼里有对手可读）。技能表里只有这一招，所以 AI 只能换位。
 * 必然事实：本招被提交过；施法者与同伴都真的挪动了位置（`stage.travelled`）——`world.swap` 把两人对调。
 *   有多少敌人的目标被跟着对调、残影表现都写进 note 供读轨迹判断。
 */
Smoke.scenario("allyswitch", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "abra", level: 32, moves: ["allyswitch"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "eevee", level: 26, moves: ["tackle"], at: [1, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [6, 0, 0] });
    stage.team("shift", [caster, ally]);
    // 只让敌人盯住施法者：施法者眼里才有威胁可读，交换场地也才有意义。
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("allyswitch", caster) > 0;
    }, function () {
        stage.expect(stage.casts("allyswitch", caster) > 0, "ally switch was committed");
        stage.expect(stage.travelled(caster) > 0.5, "the caster changed places and moved a real distance");
        stage.expect(stage.travelled(ally) > 0.5, "the ally changed places and moved a real distance");
        stage.after(80, function () {
            stage.note("交换场地把两人对调，并把误导半径内原本盯着两人的敌人目标跟着对调（原生「顶掉那一下」的翻译）。被对调了几个目标由敌人当时的目标与半径决定，是随机/时机结果；残影只是表现。交换距离随速度与等级、误导半径随等级与体型变化。", {
                casts: stage.casts("allyswitch", caster),
                casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
                allyTravelled: Math.round(stage.travelled(ally) * 10) / 10,
                casterAlive: caster.alive(),
                allyAlive: ally.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "ally switch trades places");
});

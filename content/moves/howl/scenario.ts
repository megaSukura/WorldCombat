// 长嚎的执行性设计说明：这是一声把整群伙伴物攻一起吼起来的集结，所以场面要有队友，也要有让 AI 先吼的威胁。
// 必然事实：施法者提交过长嚎；施法者与声浪半径内的队友身上都出现过共享身份 world_combat:status/howl；
//   队友的攻击等级由这段归属于自己的 boostWindow 真正抬起。
// 具体抬起几级、窗口多久、回声又把谁吼了起来，写进 note（私有装配读不到原生能力等级）。
Smoke.scenario("howl", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "mightyena", level: 34, moves: ["howl"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.team("pack", [caster, ally]);
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("howl", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/howl");
    }, function () {
        stage.expect(stage.casts("howl", caster) > 0, "howl was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/howl"), "caster carried the shared howl identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/howl"), "the nearby ally carried the shared howl identity");
        stage.expect((stage.stages(ally).atk || 0) >= 1, "the ally's own boostWindow really raised Attack");
        stage.note("长嚎以施法者为锚，提交时先吼自己，再把同一份斗志按声浪半径补给友方；每个被吼到的人各拥有一段挂在本人载体上的 boostWindow，到期/被驱散时只收回本招这一份。嗥声每 20 刻向外回荡一次，后来走进范围的伙伴按标记剩余时长被吼起（不给满窗）。具体抬起几级、窗口多久随等级、物攻、体型与嚎法变化，写进 note。", {
            casts: stage.casts("howl", caster), casterHp: caster.health(), allyHp: ally.health(),
            allyStages: stage.stages(ally), damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10, tick: stage.tick()
        });
        stage.done();
    }, "howl rouses the pack");
});

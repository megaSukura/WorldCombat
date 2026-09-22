// 戏法空间的可执行设计说明：这是一片按在地面、双方平等生效的歪斜空间，所以场面要有交战双方与一块地面。
// 必然事实：戏法空间被放出来过；站在空间里的施法者身上出现了共享身份 world_combat:status/trickroom。
// 「速度倒转」体现为移动速度被改写，需要长距离移动才看得明显，本场景把轨迹留给 note 与完整装配试玩核对。
Smoke.scenario("trickroom", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const caster = stage.pokemon({ species: "abra", level: 34, moves: ["trickroom"], at: [-3, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 22, moves: ["tackle"], at: [5, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("trickroom", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/trickroom");
    }, function () {
        stage.expect(stage.casts("trickroom", caster) > 0, "trickroom was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/trickroom"), "the caster standing inside carried the shared trickroom identity");
        stage.note("戏法空间按在落点，半径内的活体带共享身份；速度倒转由 navigate 事件按成员表改写（慢的变快、快的变慢）。本场景只有一次短程交战，位移差异写进轨迹供读，兑现留给完整装配试玩。半径、时长、基准、幅度、密度随身高/特攻/特防/等级变化，强扭与缓扭各有取舍。", {
            casts: stage.casts("trickroom", caster),
            casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
            targetTravelled: Math.round(stage.travelled(target) * 10) / 10
        });
        stage.done();
    }, "the twisted space holds");
});

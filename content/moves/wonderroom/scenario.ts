// 奇妙空间的可执行设计说明：这是一片按在地面、双方平等生效的交换空间，所以场面要有交战双方与一块地面。
// 必然事实：奇妙空间被放出来过；站在空间里的施法者身上出现了共享身份 world_combat:status/wonderroom。
// 「防御／特防对调」体现在伤害结算读取的防御数字上，需要一次命中才看得明显，写进 note 供读轨迹与完整装配试玩核对。
Smoke.scenario("wonderroom", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const caster = stage.pokemon({ species: "drowzee", level: 32, moves: ["wonderroom"], at: [-3, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 22, moves: ["tackle"], at: [5, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("wonderroom", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/wonderroom");
    }, function () {
        stage.expect(stage.casts("wonderroom", caster) > 0, "wonderroom was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/wonderroom"), "the caster standing inside carried the shared wonderroom identity");
        stage.note("奇妙空间按在落点，半径内的活体带共享身份；对调由共享伤害事实读取器按身份执行，命中该活体时读到的防御与特防互换。本场景对手只有撞击，对调后的伤害差写进轨迹供读，兑现留给完整装配试玩。半径、时长、密度随身高/特攻/等级变化，广域与紧凑各有取舍。", {
            casts: stage.casts("wonderroom", caster),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.done();
    }, "the swap space holds");
});

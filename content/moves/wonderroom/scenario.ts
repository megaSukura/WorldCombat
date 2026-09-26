// 奇妙空间的可执行设计说明：这是一片按在地面、双方平等生效的交换空间，所以场面要有交战双方、一块地面，
// 以及一个只有单条防御通道的原版生物用来验证「不显示已换」。
// 必然事实：奇妙空间被放出来过；站在空间里的双通道施法者身上出现了共享身份 world_combat:status/wonderroom；
// 同场的单通道原版生物不会得到这条身份。「防御／特防对调」体现在伤害结算读取的防御数字上，写进 note 供读轨迹与完整装配试玩核对。
Smoke.scenario("wonderroom", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const caster = stage.pokemon({ species: "slowbro", level: 32, moves: ["wonderroom"], at: [-3, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 22, moves: ["tackle"], at: [5, 0, 0] });
    const plain = stage.mob({ type: "minecraft:zombie", at: [-2, 0, 0] });
    stage.noai(plain);
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("wonderroom", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/wonderroom");
    }, function () {
        stage.expect(stage.casts("wonderroom", caster) > 0, "wonderroom was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/wonderroom"), "the dual-channel caster standing inside carried the shared wonderroom identity");
        stage.expect(!stage.hadMobEffect(plain, "world_combat:status/wonderroom"), "the single-channel vanilla mob was not marked as swapped");
        stage.note("奇妙空间按在落点，半径内、同时具有防御与特防两条通道的活体才带共享身份；对调由共享伤害事实读取器按身份执行，命中该活体时读到的防御与特防互换。同场的原版僵尸没有双防通道，只从场边经过而不被标记。半径、时长、密度随身高/特攻/等级变化，广域与紧凑各有取舍；AI 只在落点范围内存在正收益对象时才自动施放。", {
            casts: stage.casts("wonderroom", caster),
            casterHp: caster.health(),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.done();
    }, "the swap space holds");
});

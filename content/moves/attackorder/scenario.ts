/**
 * 攻击指令 / attackorder —— 可执行设计说明。
 *
 * 一句话：一只只会攻击指令的蜂女王对着身前的对手振翅，放出一队手下从身边扑过去，各自刺中目标一下。
 * 必然事实：本招被放出过、目标受到过伤害（每只手下各自结算一小段，都回到同一个目标身上）。
 * 放出几只、每只多重、有没有被中途打掉取决于等级、档位与目标，写进 note 供读轨迹判断。
 */
Smoke.scenario("attackorder", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "vespiquen", level: 45, moves: ["attackorder"], at: [-3, 0, 0], properties: "gender=female" });
    // 只会跃起、打不还手的靶子：手下能全部飞到并落刺。
    var foe = stage.pokemon({ species: "hariyama", level: 60, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("attackorder", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("attackorder", caster) >= 1, "the vespiquen called its underlings");
        stage.expect(stage.damageTo(foe) > 0, "the underlings reached and stung the foe");
        stage.note("手下面数（等级驱动，精锐默认 3 只、虫海 +2 只）与每只威力（物攻与等级驱动）是设计事实；每只手下用施法者的属性各自结算一次 sting、各自掷一次会心，被中途打掉的手下不再落刺。本场景的靶子不会还手，手下能全部飞到。", {
            casts: stage.casts("attackorder", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "the underlings sting within 60 s");
});

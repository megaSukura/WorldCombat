/**
 * 嬉闹的可执行设计说明：让会这一招的布鲁朝一名被定住的格斗系目标滚过去，验证扑撞命中、造成伤害。
 * 早一步写入 `prefer(romp: true)`，让 AI 的首次决策就带上撒欢式；侧向再摆一个可见、可达的敌人，
 * 读出真正转身滚向第二个的过程（第二个被打中记在 note 里，不写成硬断言）。
 * 顶开距离与降攻（基础 10% 起）是位置／随机结果，也只作记录。
 */
Smoke.scenario("playrough", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    var snubbull = stage.pokemon({ species: "snubbull", level: 30, moves: ["playrough"], at: [-3, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 25, moves: ["tackle"], at: [0, 0, 0] });
    var geodude = stage.pokemon({ species: "geodude", level: 22, moves: ["tackle"], at: [0.6, 0, 2.8] });
    stage.hostile(snubbull, machop);
    stage.hostile(snubbull, geodude);
    stage.noai(machop, geodude);
    // 偏好要在绑定 announce 之后再写；早于首次 AI 决策，才能影响第一次出手。
    stage.after(1, function () {
        stage.prefer(snubbull, "playrough", { romp: true });
        stage.until(900, function () { return stage.casts("playrough", snubbull) > 0 && stage.damageTo(machop) > 0; }, function () {
            stage.expect(stage.casts("playrough", snubbull) > 0, "嬉闹被放出来了");
            stage.expect(stage.damageTo(machop) > 0, "扑撞打到了第一个目标身上");
            // 第二段翻滚在首段撞击后隔 2 刻才起滚，等动作走完再看是否真的翻到了第二个。
            stage.after(60, function () {
                stage.note("顶开距离、侧向第二次翻滚是否命中，以及降攻（基础 10% 起）都是位置／随机结果，只作记录。",
                    { casts: stage.casts("playrough", snubbull), damage: Math.round(stage.damageTo(machop) * 10) / 10,
                      second: Math.round(stage.damageTo(geodude) * 10) / 10,
                      secondHits: stage.hits(geodude, true),
                      moved: Math.round(stage.travelled(snubbull) * 10) / 10 });
                stage.done();
            });
        }, "扑撞命中目标");
    });
});

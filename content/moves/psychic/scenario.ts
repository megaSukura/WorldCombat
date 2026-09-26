/**
 * 精神强念的可执行设计说明：让会这一招的超能力系对手朝一名格斗系目标聚念，验证抓取命中、造成伤害。
 * 命中后再等一段，让 `squeezeDelay` 操纵窗口与随后的挤压真实跑完，读轨迹里的位移与总伤害。
 * 定身（rooted）、操纵窗口里的位移与随后那记挤压都是可读的机制结果；特防下降是随机的，写进 note。
 */
Smoke.scenario("psychic", function (stage) {
    var abra = stage.pokemon({ species: "abra", level: 38, moves: ["psychic"], at: [-5, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(abra, machop);
    stage.until(900, function () { return stage.casts("psychic", abra) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("psychic", abra) > 0, "精神强念被放出来了");
        stage.expect(stage.damageTo(machop) > 0, "擒压打到了目标身上");
        var gripDamage = stage.damageTo(machop);
        stage.after(50, function () {
            stage.note("特防下降（基础 10% 起）是随机结果；抓取成功后有一个 squeezeDelay 刻的操纵窗口，脚本/AI 没有手动锚点时默认朝施法者带，窗口结束只有抓取仍成立、目标仍在范围且通视才落挤压。窗口与挤压跑完后记录总伤害与目标位移。",
                { casts: stage.casts("psychic", abra), gripDamage: Math.round(gripDamage * 10) / 10,
                  totalDamage: Math.round(stage.damageTo(machop) * 10) / 10,
                  moved: Math.round(stage.travelled(machop) * 10) / 10 });
            stage.done();
        });
    }, "擒压命中目标");
});

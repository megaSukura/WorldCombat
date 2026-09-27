namespace PokemonSkills {
    actionParameters.define("coil", {
        stride: formula(F.base(.9).plus(F.body("width").times(.4)).clamp(.8, 1.8).times(2).clamp(2, 4)
            .times(F.when(F.pref("tight", text("worldcombat.skill.coil.preference.tight")), F.const(.75), F.const(1))).round(2),
            "弹步距离", { unit: " 格", description: "体宽决定弹步距离；盘紧只走四分之三。真实身体碰撞或前方无地面时提前停步。" }),
        spring: formula(F.when(F.pref("tight", text("worldcombat.skill.coil.preference.tight")), F.const(1.5), F.const(1.25)),
            "盘劲倍率", { unit: " 倍", description: "下一次成功的贴身物理接触获得倍率；一次命中后耗尽，零伤或全吸收保留。" }),
        brace: seconds(F.const(80), "盘劲窗口", "弹步后携带一份盘劲四秒，逾期或被清除即消散。"),
        tempo: seconds(F.base(9).minus(F.stat("speed").minus(60).times(.02))
            .plus(F.when(F.pref("tight", text("worldcombat.skill.coil.preference.tight")), F.const(4), F.const(0))).clamp(6, 14).round(0),
            "起手", "盘紧后自动弹步；速度越高越早完成，盘紧多准备四刻。"),
        aftercast: seconds(F.base(6).plus(F.body("height")).clamp(6, 10).round(0), "收招", "弹步结束后的收势。"),
        wait: seconds(F.base(95).minus(F.level().times(.6))
            .plus(F.when(F.pref("tight", text("worldcombat.skill.coil.preference.tight")), F.const(15), F.const(0))).clamp(60, 120).round(0),
            "冷却", "等级越高冷却越短；盘紧多等待十五刻。")
    });
    stages("coil", [{ level: 40, values: { wait: 86 } }, { level: 55, values: { wait: 78 } }]);
    describe("coil", [
        { key: "description.0", values: ["stride", "spring", "brace"] },
        { key: "description.1", values: ["tempo", "aftercast", "wait"] },
        { key: "tight.on", values: [], when: c => read(c.detail.values, ["tight"]) === true },
        { key: "tight.off", values: [], when: c => read(c.detail.values, ["tight"]) !== true },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
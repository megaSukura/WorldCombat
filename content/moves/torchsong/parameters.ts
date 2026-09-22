/**
 * 闪焰高歌 / torchsong 的参数与数值来源。
 *
 * 原生事实：火、特殊、威力 80、命中 100、PP 10、声音（sound）、穿替身（bypasssub）；命中后自身特攻 +1（100%）。
 * 翻译：把「如唱歌一样喷出熊熊燃烧的火焰烧焦对手、提高自己特攻」翻成一次**站定引吭的火锥长音**——
 * 不接触，张口朝目标喷出一道越唱越旺的火焰；歌声把这股热顺着嗓子送出去，唱完自己的特攻也被抬上一级。
 * 这是本家族里唯一的远程特殊招，也是唯一的持续（多段脉冲）节奏。
 *
 * 数值分散（每项依赖不同的精灵数据）：
 *   song    总威力：特攻与等级共同打底；长音式再抬高总量。
 *   reach   火锥长度：特攻偏移。
 *   spread  火锥张角（总角）：等级偏移；长音式更开。
 *   pulses  脉冲段数：基础 4，长音 +2，等级 60 台阶再 +1；每段吃总威力的 1/pulses。
 *   interval 段间隔：固定 6 刻。
 *   spaGift 特攻级数：等级 60 起 +1。
 *   notes   音符与火星数量：特攻派生，表现按它发射。
 *   push    击退：特攻微调。
 *   inhale/recover/cooldown 起手吃特攻、收招固定、冷却吃配置（PP 10 的代价）。
 *
 * 配置 `marcato`（长音）：开启＝唱得更久、锥面更开、总量更高，但站桩更久、冷却更长；关闭＝短啸，出手利落。
 */
namespace PokemonSkills {
    actionParameters.define("torchsong", {
        /** 总威力：基础 80，特攻每比 60 多 1 加 0.16（夹 -20..34），等级每比 50 高 1 加 0.2；长音 ×1.1，夹 60..150。 */
        song: formula(
            F.base(80).plus(F.stat("specialAttack").minus(60).times(0.16).clamp(-20, 34))
                .plus(F.level().minus(50).times(0.2))
                .times(F.when(F.pref("marcato", text("worldcombat.skill.torchsong.preference.marcato")), F.const(1.1), F.const(1)))
                .clamp(60, 150).round(1),
            "总威力", {
                unit: "威力",
                description: "整支歌烧出来的总威力，按段数分摊到每一段；特攻越高、等级越高唱得越旺，长音式再抬总量。对手防御、相性与暴击在命中时另算。"
            }),
        /** 火锥长度：基础 6 格，特攻每比 60 多 1 加 0.025，夹 5..9。 */
        reach: formula(
            F.base(6).plus(F.stat("specialAttack").minus(60).times(0.025)).clamp(5, 9).round(2),
            "火锥长度", {
                unit: "格",
                description: "火焰喷出多远；特攻越高铺得越远。它同时是本招的射程基准。"
            }),
        /** 火锥张角（总角）：基础 26 度，等级每比 50 高 1 加 0.3；长音 ×1.25，夹 20..48。 */
        spread: formula(
            F.base(26).plus(F.level().minus(50).times(0.3))
                .times(F.when(F.pref("marcato", text("worldcombat.skill.torchsong.preference.marcato")), F.const(1.25), F.const(1)))
                .clamp(20, 48).round(0),
            "火锥张角", {
                unit: "度",
                description: "火焰扇面张开的总角度；越宽越罩得住并排的对手，长音式更开。"
            }),
        /** 脉冲段数：基础 4，长音 +2，等级 60 台阶 +1，夹 3..7。 */
        pulses: formula(
            F.base(4).plus(F.when(F.pref("marcato", text("worldcombat.skill.torchsong.preference.marcato")), F.const(2), F.const(0)))
                .clamp(3, 7).round(0),
            "脉冲段数", {
                unit: "段",
                description: "一支歌唱出几段火焰；总威力按段数分摊。段数越多，中途被打断的风险越大。"
            }),
        /** 段间隔：固定 6 刻。 */
        interval: seconds(F.base(6).round(0), "段间隔", "两段火焰之间隔多久。"),
        /** 特攻级数：等级 60 台阶 +1，夹 1..2。 */
        spaGift: formula(F.base(1).clamp(1, 2).round(0), "特攻级数", {
            unit: "级",
            description: "唱完后提高的特攻等级；这一嗓子把自己的火也烧旺了。脱战后同样消退。"
        }),
        /** 音符与火星数量：基础 26，特攻每比 60 多 1 加 0.4（夹 -8..24），夹 18..60。 */
        notes: formula(
            F.base(26).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-8, 24)).clamp(18, 60).round(0),
            "音符数量", {
                unit: "个",
                description: "火焰里裹着的音符与火星数量，随特攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 击退：基础 0.15 格，特攻每比 60 多 1 加 0.0015，夹 0.1..0.4。 */
        push: formula(
            F.base(0.15).plus(F.stat("specialAttack").minus(60).times(0.0015)).clamp(0.1, 0.4).round(2),
            "击退", {
                unit: "格",
                description: "火锥把目标往后顶开一点；唱得旺的个体送得更远。"
            }),
        /** 起手：基础 10 刻，特攻每比 60 多 1 少 0.01，夹 8..12。 */
        inhale: seconds(
            F.base(10).minus(F.stat("specialAttack").minus(60).times(0.01)).clamp(8, 12).round(0),
            "起手", "吸满一口气、把火压到嗓子口的时长。"),
        recover: seconds(F.base(10).round(0), "收招", "唱完收声的余韵。"),
        cooldown: seconds(
            F.base(50).plus(F.when(F.pref("marcato", text("worldcombat.skill.torchsong.preference.marcato")), F.const(14), F.const(0))).round(0),
            "冷却", "再唱一支歌前的间隔；长音式更久。PP 10 的代价。")
    });

    defineDamage("torchsong", "song", {}, { sound: true });

    stages("torchsong", [
        { level: 44, values: { song: 92 } },
        { level: 60, values: { song: 108, pulses: 5, spaGift: 2 } }
    ]);

    describe("torchsong", [
        { key: "description.0", values: ["song", "pulses", "interval"] },
        { key: "description.1", values: ["reach", "spread", "spaGift", "push", "notes"] },
        { key: "marcato.on", values: [], when: function (context) { return read(context.detail.values, ["marcato"]) === true; } },
        { key: "marcato.off", values: [], when: function (context) { return read(context.detail.values, ["marcato"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.song"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.song", "tier.1.pulses", "tier.1.spaGift"] }
    ]);
}

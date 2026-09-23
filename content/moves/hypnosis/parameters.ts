/**
 * 催眠术 / Hypnosis —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Psychic／变化／威力 0／命中 60／PP 20／单体，命中后目标陷入睡眠（slp）。
 *
 * 世界化：把「用暗示诱导睡意」翻成一记**从眼里放出去的凝视波**——施法者盯住目标，一圈圈暗示光环沿一条
 *   通视的直线滚过去，把睡意灌进它脑里。它不造成伤害，成败取决于意志对抗：施法者的特攻与等级压过
 *   目标的特防与等级时，才把对方拉进睡眠；压不过就只是让光环散在对方身上。低命中在这里落成一场
 *   看得见的对抗，而不是一次纯掷骰——走位、通视与双方实力都参与。
 *
 * 与同族分开：哈欠必中但睡意要等；恶魔之吻必须贴身。催眠术是唯一**隔空、瞬发**的一条，代价是它最不牢靠；
 *   它也不要求对方干净——身上带着别的状态的目标照样能被催眠（原生 onTryHit 不检查已有状态）。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数上）：
 *   reach       凝视距离 8 + 等级偏移 + 特攻偏移；凝神式 ×0.85 / 随惑式 ×1.2；夹 6..15。
 *   gazeTicks   催眠时长 200 + 特攻偏移 + 亲密度 ×0.4；凝神式 ×1.2 / 随惑式 ×0.8；夹 120..440。
 *   landChance  成功率 0.60 +（特攻 − 目标特防）× 0.0035 + 等级差 ×0.004；凝神式 ×1.25 / 随惑式 ×0.8；夹 0.30..0.92。
 *   gazeRadius  落点半径 0.42 + 身高偏移；夹 0.26..0.75。
 *   rings       波圈数 4 + 特攻偏移；夹 4..18（也是画面里光环的圈数）。
 *   waveSpeed   波速 1.2 + 速度偏移；夹 0.7..2.6 格/刻。
 *   tempo／aftercast／recharge 速度与等级决定起手、收招、冷却；凝神式起手 +3、冷却 ×1.15。
 *
 * 配置 `focus`（凝神）双向取舍：开＝成功率 ×1.25、睡眠 ×1.2，但射程 ×0.85、起手 +3、冷却 ×1.15（赌一次成功的稳压）；
 *   关（随惑）＝射程 ×1.2、出手快、冷却短，但成功率 ×0.8、睡眠 ×0.8（多试几次的快扰）。两向各有局面。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const hypnosisId = "hypnosis";
    export const hypnosisScene = "world_combat:move_hypnosis";
    export const hypnosisTrance = "world_combat:hypnosis_trance";

    actionParameters.define(hypnosisId, {
        /** 凝视距离：8 + 等级(≥30)偏移[0,2.4] + 特攻偏移[−1.5,3]；凝神 ×0.85 / 随惑 ×1.2；夹 6..15。 */
        reach: formula(
            F.base(8)
                .plus(F.level().minus(30).times(0.08).clamp(0, 2.4))
                .plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-1.5, 3))
                .times(F.when(F.pref("focus"), F.const(0.85), F.const(1.2)))
                .clamp(6, 15).round(2),
            "凝视距离", {
                unit: " 格",
                description: "暗示能沿直线送多远；等级越高、特攻越强够得越远。它也是本招的实际射程，且需要一条没有被挡住的视线。"
            }),
        /** 催眠时长：200 + 特攻偏移[−40,120] + 亲密度 ×0.4；凝神 ×1.2 / 随惑 ×0.8；夹 120..440。 */
        gazeTicks: seconds(
            F.base(200)
                .plus(F.stat("specialAttack").minus(60).times(0.9).clamp(-40, 120))
                .plus(F.individual("friendship").times(0.4))
                .times(F.when(F.pref("focus"), F.const(1.2), F.const(0.8)))
                .clamp(120, 440).round(0),
            "催眠时长", "被带进睡眠后睡多久；特攻越高、越亲近的个体让人睡得更沉。受伤害会立刻惊醒。"),
        /** 成功率：0.60 +（特攻 − 目标特防）×0.0035 + 等级差 ×0.004；凝神 ×1.25 / 随惑 ×0.8；夹 0.30..0.92。 */
        landChance: percent(
            F.base(0.60)
                .plus(F.stat("specialAttack").minus(F.target("stat.specialDefence")).times(0.0035).clamp(-0.25, 0.32))
                .plus(F.level().minus(F.target("level")).times(0.004).clamp(-0.10, 0.10))
                .times(F.when(F.pref("focus"), F.const(1.25), F.const(0.8)))
                .clamp(0.30, 0.92),
            "成功率", "暗示压过对方意志的概率：特攻与等级压过目标的特防与等级才更容易成立。它是一场看得见的意志对抗，不成立时光环散在对方身上。"),
        /** 落点半径：0.42 + 身高偏移[−0.08,0.30]；夹 0.26..0.75。 */
        gazeRadius: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.26, 0.75).round(2),
            "落点半径", {
                unit: " 格",
                description: "凝视波在目标头上罩住多大一圈；个高的个体落点更宽。"
            }),
        /** 波圈数：4 + 特攻偏移[0,10]；夹 4..18；等级台阶再抬。 */
        rings: formula(
            F.base(4).plus(F.stat("specialAttack").minus(60).times(0.08).clamp(0, 10)).clamp(4, 18).round(0),
            "波圈数", {
                unit: " 圈",
                description: "暗示光环一圈圈滚出去的数量；特攻越高越密，也是画面里环的圈数。"
            }),
        /** 波速：1.2 + 速度偏移[−0.4,1.0]；夹 0.7..2.6。 */
        waveSpeed: formula(
            F.base(1.2).plus(F.stat("speed").minus(60).times(0.012).clamp(-0.4, 1.0)).clamp(0.7, 2.6).round(2),
            "波纹速度", {
                unit: " 格/刻",
                description: "光环沿直线滚过去的快慢；速度快的个体送得更急，画面里的推进也更利落。"
            }),
        /** 起手：12 − 速度偏移[−2,3] + 凝神 3；夹 7..20。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("focus"), F.const(3), F.const(0)))
                .clamp(7, 20).round(0),
            "起手", "盯住对方、把光环攒出来需要多久；速度越快越短，凝神式多定一拍。"),
        /** 收招：8 − 速度偏移[−2,2]；夹 4..14。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2)).clamp(4, 14).round(0),
            "收招", "波送出去后收回视线的时间。"),
        /** 冷却：70 − 等级(≥25)偏移[0,12]；凝神 ×1.15 / 随惑 ×0.9；夹 36..120。 */
        recharge: seconds(
            F.base(70).minus(F.level().minus(25).times(0.25).clamp(0, 12))
                .times(F.when(F.pref("focus"), F.const(1.15), F.const(0.9)))
                .clamp(36, 120).round(0),
            "冷却", "两次凝视之间的等待；等级越高回得越快，凝神式缓得更久。")
    });

    stages(hypnosisId, [
        { level: 35, values: { rings: 10 } },
        { level: 50, values: { rings: 14, gazeTicks: 280, landChance: 0.78 } }
    ]);

    describe(hypnosisId, [
        { key: "description.0", values: ["reach", "landChance"] },
        { key: "description.1", values: ["gazeTicks"] },
        { key: "focus.on", values: [], when: function (context) { return read(context.detail.values, ["focus"]) === true; } },
        { key: "focus.off", values: [], when: function (context) { return read(context.detail.values, ["focus"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.gazeTicks", "tier.1.landChance"] }
    ]);
}

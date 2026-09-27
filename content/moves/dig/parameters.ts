/**
 * 挖洞 / Dig — 参数与数值来源。
 *
 * 原生：地面／物理／威力 80／命中 100／PP 10；第一回合钻地、第二回合攻击，钻地期间免疫大多数招式。
 * 即时战斗里没有回合，两拍结构改成一个可读的真实过程：起手锁点后，术者**真的从天然土里钻出一条短通道**，
 * 下潜、前移、在落点破土。预检找不到天然土通道（人工建材、矿石、带方块实体的方块、水／岩浆、或太远、太大）
 * 时这一招不发动，而不是隔空闪现。
 *
 * 世界化：破土掀起来的是脚下材料，但本招的辨识度在**通道本身**——它绕开的是地表障碍，而不是把术者瞬移过去。
 * 通道只开在天然土／石里，最多 64 格临时空气、水平不超过 8 格；出土那一下只结算真正被身体扫到的第一具敌对活体。
 *
 * 数值来源（每个参数取不同的精灵数据，公式即悬浮说明里展开的那一棵）：
 *   power           = 基础 80 + (物攻 − 70) × 0.25（夹在 −12..+30）；等级阶梯 25/50 级再抬一档。
 *   launch          = 基础 0.7 × √(物攻 / 80)（夹在 0.7..1.4 倍）：力气越大把东西掀得越高。
 *   burrowTicks     = 基础 11 − (速度 − 60) × 0.07（夹在 4..16）：速度越快整段地下行进越短。
 *   collisionRadius = 基础 0.45 + (实时碰撞箱高度 − 1.4) × 0.12（夹在 0.35..0.9）：出土横扫贴到目标身上的横向半径。
 * 通道的最大水平 8 格与最大 64 格临时空气是协议常量；身形越大每格截面越宽，实际能走的距离就越短。
 */
namespace PokemonSkills {
    const DIG_ID = "dig";

    actionParameters.define(DIG_ID, {
        /** 破土威力：物攻每比 70 多 1 加 0.25（上限 +30），少 1 减 0.25（下限 −12）；夹在 62..128。 */
        power: formula(
            F.base(80)
                .plus(F.stat("attack").minus(70).times(0.25).clamp(-12, 30))
                .clamp(62, 128).round(1),
            "破土威力", {
                unit: "威力",
                description: "出土横扫命中时的基础威力；力气越大，破土越沉。对手防御、相性与暴击在命中时另算。"
            }),
        /** 击飞高度：基础 0.7 格 × √(物攻 / 80)，夹在 0.7..1.4 倍；夹在 0.4..1.5 格。 */
        launch: formula(
            F.base(0.7)
                .times(F.stat("attack").div(80).pow(0.5).clamp(0.7, 1.4))
                .clamp(0.4, 1.5).round(2),
            "击飞高度", {
                unit: "格",
                description: "出土时把被扫到的目标向上掀多高；力气越大掀得越高。"
            }),
        /** 地下行进：基础 11 刻 −(速度 − 60)× 0.07，夹在 4..16 刻；下潜、前移、上钻三段分摊。 */
        burrowTicks: formula(
            F.base(11)
                .minus(F.stat("speed").minus(60).times(0.07).clamp(-2, 5))
                .clamp(4, 16).round(0),
            "地下行进", {
                unit: "刻",
                description: "钻入、前移到出土总共花的时间；速度越快越短。这段时间是对手走开或加强戒备的窗口。"
            }),
        /** 碰撞半径：基础 0.45 格 +(碰撞箱高度 − 1.4)× 0.12，夹在 0.35..0.9 格。 */
        collisionRadius: formula(
            F.base(0.45)
                .plus(F.body("height").minus(1.4).times(0.12))
                .clamp(0.35, 0.9).round(2),
            "碰撞半径", {
                unit: "格",
                description: "出土横扫贴到目标身上的横向半径；身体越高大越大。"
            })
    });

    defineDamage(DIG_ID, "power", {
        rationale: "出土横扫对真正被身体扫到的第一个敌对活体结算一次；没有范围伤害，也就不存在边缘衰减。"
    });

    stages(DIG_ID, [
        { level: 1, values: { power: 80 } },
        { level: 25, values: { power: 95 } },
        { level: 50, values: { power: 110 } }
    ]);

    describe(DIG_ID, [
        { key: "description.0", values: ["power"] },
        { key: "description.1", values: ["burrowTicks"] },
        { key: "description.motion", values: ["range","launch"] },
        { key: "description.2", values: [] },
        { key: "description.3", values: [], when: function (context) { return !!read(context.detail.values, ["ambush"]); } },
        { key: "description.4", values: [], when: function (context) { return !read(context.detail.values, ["ambush"]); } },
        { key: "description.5", values: [] },
        { key: "timing", values: ["prepare", "recover", "cooldown"] },
        { key: "growth.0", values: [], when: function (context) { return context.pokemon.level() >= 25; } },
        { key: "growth.1", values: [], when: function (context) { return context.pokemon.level() >= 50; } }
    ]);
}

/**
 * 齿轮飞盘 / geargrind —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**钢**／物理／威力 50／命中 85／PP 15／连续 2 次（`multihit: 2`）。介绍：
 *   「向对手投掷钢铁齿轮进行攻击。连续2次给予伤害。」全项目 3 位学习者，正是齿轮宝可梦一族（小炭仔/几何雪花线
 *   之外的 Klink 家族：齿轮儿／齿轮组／齿轮怪）。
 *
 * 翻译：把「投掷钢铁齿轮、连续两次」落成一记**交错投掷**——施法者从身体两侧各甩出一枚旋转的钢齿轮，
 *   一左一右交错飞向对手，在空中互相啮合着从两侧合拢；齿轮撞到东西会弹开一下，落地的齿轮还会在原地转一会儿。
 *   它是本组唯一的远程、钢属性、弹道两连，投出的齿轮是真实会飞、会弹、会留在场上的东西。
 *   与同族分开：双尾扫是贴地横扫、三连踢是同一方向连踢、双光束是收拢的灵光、磁铁炸弹是吸附后起爆；
 *   只有齿轮飞盘是**两枚可弹跳的实体齿轮从两侧交错合拢**。
 *
 * 数据分散（每一项读不同的精灵数据，小差距才会在场上看得出来）：
 *   tooth     第一枚齿轮威力：物攻（甩得多重）＋等级；交错式较轻。
 *   sprocket  第二枚齿轮威力：速度（后续掷得更快）＋物攻；配置决定轻重。
 *   reach     投掷距离：攻击＋等级；也是本招实际射程来源。
 *   speed     齿轮飞行速度：速度（腕力）。
 *   spread    偏离角（命中 85 的翻译）：速度越稳偏得越小；直线式更准。
 *   turn      追踪转向：等级＋攻击；直线式为 0（不追踪）。
 *   offset    两枚齿轮的横向错开：碰撞箱宽度（身体越宽从越开的两侧甩出）。
 *   gearRadius 判定半径：碰撞箱宽度。
 *   shards    迸出的钢屑数量：物攻，直接驱动粒子发射量。
 *   gap       两枚间隔：速度。
 *   tempo/recover/recharge：速度与等级。
 *
 * 配置 `cross`（交错式，默认开）双向取舍：开启＝两枚齿轮从身体两侧甩出、错开后追踪合拢，侧向躲闪会被另一枚兜住
 *   （偏角更宽），代价是每枚 ×0.95、飞得略慢、间隔 +2 刻。关闭（直射式）＝两枚沿同一条线笔直快飞、不追踪，
 *   每枚 ×1.1、更准更快，但整体向一侧走位就能一起躲开。两向各有适用局面：控走位用交错，抢输出用直射。
 *
 * 伤害段 tooth／sprocket：每一枚齿轮各自结算一次钢属性伤害，规格空（共享结算乘入物攻/速度段、对手物防、相性与暴击）。
 */
namespace PokemonSkills {
    export const geargrindId = "geargrind";
    export const geargrindScene = "world_combat:move_geargrind";
    export const geargrindText = "world_combat.move.geargrind.text.clatter";

    actionParameters.define(geargrindId, {
        /** 第一枚威力：基础 50，物攻每比 60 多 1 加 0.2（夹 -6..16），等级每比 20 高 1 加 0.08（夹 0..3）；交错 ×0.95 / 直射 ×1.1；夹 28..78。 */
        tooth: formula(
            F.base(50)
                .plus(F.stat("attack").minus(60).times(0.2).clamp(-6, 16))
                .plus(F.level().minus(20).times(0.08).clamp(0, 3))
                .times(F.when(F.pref("cross"), F.const(0.95), F.const(1.1)))
                .clamp(28, 78).round(1),
            "第一枚威力", {
                unit: "威力",
                description: "先甩出的那枚齿轮各自结算的钢属性威力；物攻越高甩得越重，等级越高越稳。对手物防、相性与暴击在命中时另算。"
            }),
        /** 第二枚威力：基础 50，速度每比 60 快 1 加 0.14（夹 -5..14），物攻每比 60 多 1 加 0.08（夹 -2..8）；交错 ×0.95 / 直射 ×1.1；夹 28..78。 */
        sprocket: formula(
            F.base(50)
                .plus(F.stat("speed").minus(60).times(0.14).clamp(-5, 14))
                .plus(F.stat("attack").minus(60).times(0.08).clamp(-2, 8))
                .times(F.when(F.pref("cross"), F.const(0.95), F.const(1.1)))
                .clamp(28, 78).round(1),
            "第二枚威力", {
                unit: "威力",
                description: "随后甩出的那枚齿轮各自结算的钢属性威力；出手越快掷得越沉。对手物防、相性与暴击在命中时另算。"
            }),
        /** 投掷距离：基础 8 格，攻击每比 60 多 1 加 0.02（夹 -1..2.5），等级每比 20 高 1 加 0.12（夹 0..3）；夹 6..14。 */
        reach: formula(
            F.base(8)
                .plus(F.stat("attack").minus(60).times(0.02).clamp(-1, 2.5))
                .plus(F.level().minus(20).times(0.12).clamp(0, 3)).clamp(6, 14).round(1),
            "投掷距离", {
                unit: "格",
                description: "齿轮能甩到多远；物攻与等级越高甩得越远。它也是本招的实际射程来源。"
            }),
        /** 飞行速度：基础 0.9，速度每比 60 快 1 加 0.01（夹 -0.25..0.5）；交错 ×0.9 / 直射 ×1.05；夹在 0.5..1.7。 */
        speed: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.25, 0.5))
                .times(F.when(F.pref("cross"), F.const(0.9), F.const(1.05))).clamp(0.5, 1.7).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "齿轮每刻飞多远；出手越快飞得越快，交错式为了兜侧身略慢。"
            }),
        /** 偏离角：基础 6 度，速度每比 60 快 1 减 0.08（夹 -2..3）；交错 ×1 / 直射 ×0.8；夹在 2..14。 */
        spread: formula(
            F.base(6).minus(F.stat("speed").minus(60).times(0.08).clamp(-2, 3))
                .times(F.when(F.pref("cross"), F.const(1), F.const(0.8))).clamp(2, 14).round(1),
            "偏离角", {
                unit: "度",
                description: "每一枚齿轮出手时可能偏掉的随机角度——原生命中 85 的翻译；出手越快偏得越小，直射式更准。"
            }),
        /** 追踪转向：基础 16 度/刻，等级每比 20 高 1 加 0.4（夹 0..8）；交错 ×1 / 直射 ×0；夹在 0..28。 */
        turn: formula(
            F.base(16).plus(F.level().minus(20).times(0.4).clamp(0, 8))
                .times(F.when(F.pref("cross"), F.const(1), F.const(0))).clamp(0, 28).round(1),
            "追踪转向", {
                unit: "度/刻",
                description: "齿轮每刻能修正多少航向；等级越高吸得越准。直射式为 0，齿轮只沿出手方向笔直飞。"
            }),
        /** 两侧错开：基础 0.9 格，身宽每比 0.9 宽 1 格加 0.9（夹 -0.2..1.4）；交错 ×1 / 直射 ×0；夹在 0..2.4。 */
        offset: formula(
            F.base(0.9).plus(F.body("width").minus(0.9).times(0.9).clamp(-0.2, 1.4))
                .times(F.when(F.pref("cross"), F.const(1), F.const(0))).clamp(0, 2.4).round(2),
            "两侧错开", {
                unit: "格",
                description: "两枚齿轮从身体两侧各偏出多远；身体越宽从越开的两侧甩出，交错合拢的夹角越明显。直射式为 0。"
            }),
        /** 判定半径：基础 0.22 格，身宽每比 0.9 宽 1 格加 0.12；夹在 0.16..0.4。 */
        gearRadius: formula(
            F.base(0.22).plus(F.body("width").minus(0.9).times(0.12)).clamp(0.16, 0.4).round(2),
            "判定半径", {
                unit: "格",
                description: "齿轮的碰撞与判定半径；身体越宽的个体甩出的齿轮越大。"
            }),
        /** 钢屑数量：基础 16，物攻每比 60 多 1 加 0.14（夹 -4..16）；夹在 12..40。 */
        shards: formula(
            F.base(16).plus(F.stat("attack").minus(60).times(0.14).clamp(-4, 16)).clamp(12, 40).round(0),
            "钢屑数量", {
                unit: "点",
                description: "齿轮命中或落地时迸出的钢屑数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 两枚间隔：基础 6 刻，速度每比 60 快 1 减 0.02（夹 -1..1.5），交错 +2 / 直射 −2；夹 3..10。 */
        gap: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 1.5))
                .plus(F.when(F.pref("cross"), F.const(2), F.const(-2))).clamp(3, 10).round(0),
            "两枚间隔", "两枚齿轮之间隔多久甩出；速度越快连得越紧，交错式多等一拍让第一枚先绕出去。"),
        /** 起手：基础 7 刻，速度每比 60 快 1 减 0.025（夹 -1.2..2）；夹 4..11。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.025).clamp(-1.2, 2)).clamp(4, 11).round(0),
            "起手", "从身上旋出两枚齿轮、对准方向的时间；速度越快越短。"),
        /** 收招：基础 8 刻，速度每比 60 快 1 减 0.02（夹 -1..1.5）；夹 4..12。 */
        recover: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 1.5)).clamp(4, 12).round(0),
            "收招", "两枚齿轮甩完后收回姿势的时间；速度越快收得越快。"),
        /** 冷却：基础 26 刻，等级每比 20 高 1 减 0.12（夹 0..3.5）；夹 16..34。 */
        recharge: seconds(
            F.base(26).minus(F.level().minus(20).times(0.12).clamp(0, 3.5)).clamp(16, 34).round(0),
            "冷却", "再甩一轮齿轮前的等待；等级越高回得越快。PP 15 的代价。")
    });

    defineDamage(geargrindId, "tooth", {});
    defineDamage(geargrindId, "sprocket", {});

    stages(geargrindId, [
        { level: 36, values: { tooth: 56, sprocket: 56 } },
        { level: 52, values: { tooth: 64, sprocket: 64, turn: 22 } }
    ]);

    describe(geargrindId, [
        { key: "description.0", values: ["tooth", "sprocket", "reach", "speed"] },
        { key: "description.1", values: ["spread", "turn", "offset", "shards"] },
        { key: "cross.on", values: [], when: function (context) { return read(context.detail.values, ["cross"]) === true; } },
        { key: "cross.off", values: [], when: function (context) { return read(context.detail.values, ["cross"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.tooth", "tier.0.sprocket"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.tooth", "tier.1.sprocket", "tier.1.turn"] }
    ]);
}

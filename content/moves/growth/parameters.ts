/** 生长：提升自身双攻，阳光增强提升；绿环和草叶表现身体抽长。 个体差异、配置和现场事实由以下公式定义。 */
namespace PokemonSkills {
    /** 阳光门槛：0..1 的 WorldEnvironment.sunlight 观测值；公式与表现读同一个常量。 */
    export const growthSunlight = 0.6;

    actionParameters.define("growth", {
        bodyGain: percent(F.base(0.12).plus(F.stat("specialAttack").times(0.0005)).clamp(0.12, 0.24),
            "体型增长", "暂时增大身体与碰撞体积；特攻越高增长越多，狭窄空间会限制增长。重复生长刷新时限而不叠大。"),
        /** 攻击提升：阳光足时 +2。 */
        atkGift: formula(
            F.base(1).plus(F.when(F.world("sunlight").gte(F.const(growthSunlight)), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "攻击提升", {
                unit: " 级",
                description: "生长带来的物攻等级；站在阳光下时多长一级。"
            }),
        /** 特攻提升：阳光足时 +2。 */
        spaGift: formula(
            F.base(1).plus(F.when(F.world("sunlight").gte(F.const(growthSunlight)), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "特攻提升", {
                unit: " 级",
                description: "生长带来的特攻等级；站在阳光下时多长一级。"
            }),
        /** 绿环半径：身板越大铺得越开。 */
        spread: formula(
            F.base(1.8).plus(F.body("height").times(0.5))

                .clamp(1.4, 4.5).round(2),
            "绿环半径", {
                unit: " 格",
                description: "脚边绿环的表现半径；碰撞箱越高越宽。"
            }),
        /** 草叶量：体重决定一次冒出多少。 */
        blades: formula(
            F.base(10).plus(F.body("weight").div(40))

                .clamp(8, 30).round(0),
            "草叶量", {
                unit: " 片",
                description: "一次破土而出的草叶数量；体重越大冒出的越多，粒子按它发射。"
            }),
        /** 长大窗口：标记的时长。 */
        grownTicks: seconds(
            F.base(220).plus(F.level().times(4))

                .clamp(160, 700).round(0),
            "长大窗口", "身体暂时增大的时限；等级越高越久，到期或清除后恢复原有大小。"),
        /** 起手：速度决定抽长多快。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03))
                .clamp(6, 13).round(0),
            "起手", "把身体撑大一圆需要多久；速度越高越快。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.5)).clamp(6, 11).round(0),
            "收招", "抽长之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(90).minus(F.level().times(0.5))
                .clamp(55, 100).round(0),
            "冷却", "两次生长之间的等待；等级越高越短。PP 20 的代价。")
    });

    describe("growth", [
        { key: "description.0", values: ["atkGift", "spaGift"] },
        { key: "body", values: ["bodyGain", "grownTicks"] },
        { key: "description.2", values: ["tempo","aftercast","wait"] },
        { key: "timing", values: [] }
    ]);
}

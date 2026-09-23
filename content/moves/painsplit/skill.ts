/**
 * 分担痛楚 / painsplit —— 注册与动作。
 *
 * 念头的形状：两幕。
 *   牵（windup，提交前）：一条细红的痛线从施法者牵向目标，两端各浮起一团跳动的生命光，把「要把两团生命拉平」先说清楚。
 *   分（execute，提交后）：两团生命的和沿痛线拉直，再从中间分开——低的一方被填上、高的一方被抽走，两端各落一圈落定光。
 *   无论对谁都是同一个平均值：对手可能被治好，自己也可能被抽走一截，这正是「分担」。一分不能致死，两边都被夹在至少 1 点。
 * 与同为「双向交换」的持有物家族分开：戏法与掉包交换的是手里的东西，分担痛楚交换的是彼此的生命值。
 * 它不经过属性、相性与暴击，只是把两边的生命拉向同一个数；画面把两边生命差得多少直接画成痛线上流动的密度。
 */
namespace PokemonSkills {
    const painsplitScene = "world_combat:move_painsplit";
    const painsplitGainText = "world_combat.move.painsplit.text.gain";
    const painsplitLossText = "world_combat.move.painsplit.text.loss";
    const painsplitFlatText = "world_combat.move.painsplit.text.flat";
    const painsplitMissText = "world_combat.move.painsplit.text.miss";

    /** 把双方生命拉向同一个平均值；两边都不低于 1 点。返回本次实际变化与用于表现的机制量。 */
    export function painsplitApply(world: CombatWorld, actor: CombatActor, target: CombatActor): any {
        var self = world.observe(actor), foe = world.observe(target);
        if (self === null || foe === null) return null;
        var myHp = self.health(), theirHp = foe.health();
        var average = Math.max(1, Math.floor((myHp + theirHp) / 2));
        var selfDelta = average - myHp, targetDelta = average - theirHp;
        if (selfDelta < 1 - myHp) selfDelta = 1 - myHp;
        if (targetDelta < 1 - theirHp) targetDelta = 1 - theirHp;
        var selfChange = world.health(actor, selfDelta, "world_combat:painsplit");
        var targetChange = world.health(target, targetDelta, "world_combat:painsplit");
        var gap = Math.abs(myHp - theirHp);
        var reference = Math.max(1, Math.max(self.maxHealth(), foe.maxHealth()));
        return { average: average, selfChange: selfChange, targetChange: targetChange, gap: gap,
            gauge: Math.max(0, Math.min(1, gap / reference)), myHp: myHp, theirHp: theirHp,
            selfRatio: self.maxHealth() > 0 ? myHp / self.maxHealth() : 1,
            targetRatio: foe.maxHealth() > 0 ? theirHp / foe.maxHealth() : 1 };
    }

    define({
        id: "painsplit",
        name: "分担痛楚",
        description: "牵起一条痛线，把双方的生命相加再均分：低的一方被填上、高的一方被抽走，两边都留下至少一点。谁比对方健康，谁就付出。",
        uses: ["在自己生命远低于对手时把差距拉平", "抽走一个高血量目标的一截生命", "用自损换取把对手拉到同一水平"],
        kind: "enemy",
        range: 5,
        maxRange: 8.5,
        prepare: 7,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "link",
        stationary: true,
        defaults: { ai: { maxChase: 10, margin: 0.1, leaveStation: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["painsplit"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("painsplit", "link", context)), recover: Math.round(p("painsplit", "recover", context)),
                cooldown: Math.round(p("painsplit", "cooldown", context)), active: 0, range: p("painsplit", "reach", context) };
        },
        ready: function (action: CombatAction, config: any): string {
            var world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || target === undefined || !world.valid(target) || world.friendly(target)) return "invalid-target";
            var body = world.observe(target), self = world.observe(actor);
            if (body === null || self === null) return "invalid-target";
            if (self.position().minus(body.position()).length() > p("painsplit", "reach", action)) return "out-of-range";
            if (!world.clear(self.position(), body.position())) return "target-not-visible";
            return "";
        },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            var target = action.target();
            action.present("world_combat:painsplit:" + action.id(), painsplitScene, 1, action.origin(), JSON.stringify({
                moment: "reach", target: target === null ? "" : String(target.ref()), path: ["source", "target"],
                span: target === null ? 0 : action.origin().minus(action.targetPosition()).length(), scale: scale,
                motes: Math.round(p("painsplit", "motes", action)) }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            var world = action.world(), actor = action.actor(), target = action.target();
            var self = world.observe(actor);
            if (self === null) { done(action); return; }
            if (target === null || target === undefined || !world.valid(target)) {
                WorldFeedback.emit(world, painsplitScene, 1, self.position(), { moment: "miss", scale: 1 }, 20);
                WorldFeedback.text(world, self.position().plus(WorldCombat.point(0, 1.2, 0)), painsplitMissText, [], 24);
                done(action);
                return;
            }
            var foe = world.observe(target);
            if (foe === null) { done(action); return; }
            var scale = (self.width() + self.height()) / 2.3;
            var motes = Math.round(p("painsplit", "motes", action));
            sound(action, "minecraft:entity.evoker.cast_spell");
            var result = painsplitApply(world, actor, target);
            if (result === null) { done(action); return; }
            var flow = Math.max(4, Math.min(72, Math.round(motes * (0.4 + result.gauge * 1.6))));
            WorldFeedback.emit(world, painsplitScene, 1, self.position(), { moment: "share", target: String(target.ref()),
                path: ["source", "target"], span: self.position().minus(foe.position()).length(), scale: scale,
                gap: Math.round(result.gap * 10) / 10, average: Math.round(result.average * 10) / 10, flow: flow,
                selfUp: result.selfChange > 0 ? 1 : 0, targetUp: result.targetChange > 0 ? 1 : 0 }, 34);
            sound(action, "minecraft:entity.player.hurt");
            if (result.selfChange !== 0) WorldFeedback.text(world, self.position().plus(WorldCombat.point(0, 1.15, 0)),
                result.selfChange > 0 ? painsplitGainText : painsplitLossText, [Math.abs(Math.round(result.selfChange * 10) / 10)], 30);
            if (result.targetChange !== 0) WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.0, 0)),
                result.targetChange > 0 ? painsplitGainText : painsplitLossText, [Math.abs(Math.round(result.targetChange * 10) / 10)], 30);
            if (result.selfChange === 0 && result.targetChange === 0)
                WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.0, 0)), painsplitFlatText, [], 26);
            done(action);
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: pokemon ? p("painsplit", "reach", pokemon) : 5, geometry: "line", style: "link", color: 0xFF6B5A, label: "痛线" };
        }
    });
}

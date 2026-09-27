/**
 * 快速防守 的伙伴 AI 用途：这是这招自己的一套出手计划——对准「对手下一手就要打上来」那一瞬。
 *
 * 什么局面有意义：有看得见的威胁、进入 ai.trigger 距离、自己身上还没有同一面快板；ai.ally 开启时还要身边有
 *   别的伙伴可护。先制不再是生效的前置条件——普通 MC 生物与模组 Boss 的原生攻击同样会被这面快板接住，
 *   因此它们靠近、逼近或已有弹丸飞来时都算有意义；本单元观察到的「敌人真的出手过先制」只作为强提示加分。
 * 什么时候最想出手：威胁贴身或自己被先制打到过时 base 高，抢在共享交战次序前把快板先架起来；有弹丸/近战正在
 *   逼近时再加一档，作为一轮防御预备。
 * 对谁出手：以自身为锚架板，身边同伴顺势被罩住；不追人、不换位（架板时定身）。
 * 放完之后：快板只架很短一瞬，其中任一人接住第一记直击、或到时自动收；板还在时不重复架。
 */
namespace CompanionBehavior {
    const quickGuardTrigger = PokemonSkills.number("ai.trigger", "反应距离", 2, 16, 1);
    quickGuardTrigger.help = "威胁进入这个距离就考虑架板；越大越早预判，也越可能白架。";
    const quickGuardAlly = PokemonSkills.flag("ai.ally", "留到有伙伴才架板");
    quickGuardAlly.help = "开启后，只有警戒范围内还有别的友方才架板；关闭则自己受压就架。";
    /** 观察到的先制出手在多长时间内算数。 */
    const quickGuardPressureWindow = 200;

    PokemonSkills.addPreferences("quickguard", { brace: 1, ai: { trigger: 8, ally: false } },
        [quickGuardTrigger, quickGuardAlly]);

    function quickGuardAllyNear(context: WorldBehavior.Context, radius: number): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && other.ref !== self.ref
                && CompanionBehavior.distance(other.point, self.point) <= radius) return true;
        }
        return false;
    }

    /** 一名敌人的「配招威胁」：宝可梦的已知招式里带着 priority > 0；非宝可梦来源没有可读配招，返回 false。 */
    function quickGuardPriorityMoveset(world: CombatWorld, ref: string): boolean {
        const actor = world.actor(ref);
        if (actor === null || String(actor.domain()) !== "cobblemon") return false;
        try {
            const pokemon = CobblemonCombat.pokemon(actor);
            const slots = pokemon.moveSlots();
            for (let i = 0; i < slots; i++) {
                const move = pokemon.move(i);
                if (move !== null && move.priority() > 0) return true;
            }
        } catch (error) { return false; }
        return false;
    }

    /** 是否真的有先制压力：某名敌人配招带先制，或本单元的观察点见过它出手先制。只作评分提示，不作门槛。 */
    function quickGuardPressureNear(context: WorldBehavior.Context, radius: number): boolean {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, self.point) > radius) continue;
            if (PokemonSkills.quickGuardPrioritySeen(other.ref, world.tick(), quickGuardPressureWindow)) return true;
            if (quickGuardPriorityMoveset(world, other.ref)) return true;
        }
        return false;
    }

    /** 是否有正在逼近自己的敌方近战身体或飞来的敌方弹丸：不依赖先制，普通攻击也算。 */
    function quickGuardIncoming(context: WorldBehavior.Context, radius: number): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.visible === false) continue;
            const velocity = other.velocity;
            if (!velocity || velocity.length !== 3) continue;
            const distance = CompanionBehavior.distance(other.point, self.point);
            if (distance > radius + 2) continue;
            const dx = self.point[0] - other.point[0], dy = self.point[1] - other.point[1], dz = self.point[2] - other.point[2];
            if (velocity[0] * dx + velocity[1] * dy + velocity[2] * dz > 0) return true;
        }
        try {
            const world = CompanionBehavior.world(context);
            const shots: CombatProjectileFacts[] = JSON.parse(String(world.projectiles(CompanionBehavior.point(self.point), radius + 4)));
            for (let i = 0; i < shots.length; i++) {
                const shot = shots[i];
                if (!shot.hostile) continue;
                const dx = self.point[0] - shot.position[0], dy = self.point[1] - shot.position[1], dz = self.point[2] - shot.position[2];
                if (shot.velocity[0] * dx + shot.velocity[1] * dy + shot.velocity[2] * dz > 0) return true;
            }
        } catch (error) { return false; }
        return false;
    }

    CompanionBehavior.registerUse("quickguard", {
        protocols: ["world_combat:survive"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.guarded(context, self, "world_combat:move_quickguard")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            const trigger = CompanionBehavior.ai<number>(capability, "trigger", 8);
            if (CompanionBehavior.distance(self.point, threat.point) > trigger) return false;
            if (CompanionBehavior.ai<boolean>(capability, "ally", false) && !quickGuardAllyNear(context, 5)) return false;
            return true;
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"], self = CompanionBehavior.source(context);
            if (!threat) return 0;
            const distance = CompanionBehavior.distance(self.point, threat.point);
            const trigger = CompanionBehavior.ai<number>(capability, "trigger", 8);
            let value = self.hurtAgo < 60 || distance <= 4 ? 80 : 45;
            if (quickGuardPressureNear(context, Math.max(trigger, 4))) value += 20;
            if (quickGuardIncoming(context, Math.max(trigger, 4))) value += 25;
            return value;
        }
    });
}

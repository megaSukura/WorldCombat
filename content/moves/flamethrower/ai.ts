/**
 * 喷射火焰 / flamethrower 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 13）格内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.preferClusters`（默认开）打开时，按本招真实几何（集束式一条走廊、扇面式一张扇面）从施法者
 *   指向目标，数出会一起被罩住的敌人；罩住两个以上就抬高 priority——按住喷口把一条走廊一起烧正是它最值的时候。
 *   目标还没被烧着时略优先；站定或慢速的目标会整段待在火里，priority 再抬一点，高速目标排后。够不到交给共享接近逻辑。
 * 放完之后：喷窗约 1 秒、站定压火，喷完即回，交回共享交战计划。AI 提交时朝目标方向起喷；持续转向由玩家
 *   按住时逐刻送来的控制点实现，AI 这一侧保持一次朝目标即可。
 */
namespace CompanionBehavior {
    function flamethrowerWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 13);
    }

    /** 从施法者指向目标时，本招真实走廊（集束式）或扇面（宽式）里罩得住几个可见敌人。 */
    function flamethrowerCaught(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context), reach = item.data.range;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-6) return 1;
        const ux = dx / length, uz = dz / length;
        const config = item.data.config, wide = !!(config && config.wide === true);
        let half = 0.7, cosHalf = -1;
        try {
            const scope = world(context);
            const read = { world: scope, actor: scope.source(), detail: { values: config } };
            if (wide) cosHalf = Math.cos(Math.min(180, Math.max(0, PokemonSkills.p("flamethrower", "angle", read))) * Math.PI / 360);
            else half = PokemonSkills.p("flamethrower", "halfWidth", read);
        } catch (error) { }
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref) { count++; continue; }
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * ux + oz * uz;
            if (along < 0 || along > reach) continue;
            if (wide) {
                const dist = Math.sqrt(ox * ox + oz * oz);
                if (dist < 1e-6 || (ox / dist) * ux + (oz / dist) * uz >= cosHalf) count++;
            } else if (Math.abs(-ox * uz + oz * ux) <= half) count++;
        }
        return count;
    }

    /** 目标当前的水平速度；没有速度事实时按「站住」处理（会整段待在火里）。 */
    function flamethrowerSpeed(target: CompanionBehavior.Entity): number {
        const velocity = target.velocity;
        if (!velocity || velocity.length < 3) return 0;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
    }

    CompanionBehavior.registerUse("flamethrower", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return flamethrowerWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !flamethrowerWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 20;
            if (!CompanionBehavior.status(context, target, "burn")) score += 7;
            if (CompanionBehavior.ai<boolean>(capability, "preferClusters", true) && flamethrowerCaught(context, capability, target) >= 2) score += 12;
            const speed = flamethrowerSpeed(target);
            if (speed < 0.03) score += 6; else if (speed > 0.12) score -= 5;
            return score;
        }
    });

    PokemonSkills.addPreferences("flamethrower", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("wide"), "扇面式", "boolean", {
            help: "开启：火焰在身前张开约 30 度、更易点燃，但威力摊薄、火舌更短、冷却更久，用来罩住一片。关闭（集束式）：一条细长火舌，单体更重、射得更远，用来点名。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 20, step: 1,
            help: "超过这个距离就不主动喷火，先走近；越大越愿意在更远处先手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.preferClusters"), "成线时优先", "boolean", {
            help: "开启后，目标所在走廊（集束式）或扇面（扇面式）里还罩着别的敌人时优先喷火，按住喷口把一条线一起烧；关闭则只按普通攻击排序。"
        })
    ]);
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Organization } from './organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  async findById(id: string): Promise<Organization | null> {
    return this.orgRepo.findOne({ where: { id }, relations: ['children'] });
  }

  /**
   * Get all organization IDs accessible from a given organization.
   *
   * Principle of Least Privilege:
   *   - Parent (top-level) org: sees own data + all child orgs' data (top-down visibility)
   *   - Child org: sees ONLY its own data (no parent, no siblings)
   *
   * Enforces tenant isolation — child orgs are sandboxed,
   * only the parent has a "god view" downward.
   */
  async getAccessibleOrgIds(organizationId: string): Promise<string[]> {
    const org = await this.orgRepo.findOne({
      where: { id: organizationId },
      relations: ['children'],
    });

    if (!org) return [organizationId];

    const ids: string[] = [organizationId];

    // Top-level (parent) org: include all child orgs (top-down visibility)
    if (!org.parentId && org.children) {
      org.children.forEach((child) => ids.push(child.id));
    }

    // Child org: return ONLY its own ID (no parent, no siblings)
    // — this is implicit since we only added organizationId above

    return ids;
  }

  async findAll(): Promise<Organization[]> {
    return this.orgRepo.find({ relations: ['children', 'parent'] });
  }

  async create(name: string, parentId?: string): Promise<Organization> {
    const org = this.orgRepo.create({ name, parentId: parentId || null });
    return this.orgRepo.save(org);
  }
}

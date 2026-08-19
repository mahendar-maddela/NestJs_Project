import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, OneToOne, ManyToMany, JoinTable, JoinColumn, Index } from 'typeorm';
import { StationType, StationStatus } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { Location } from './location.entity';
import { StationAmenity } from './station-amenity.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { StationFavourite } from './station-favourite.entity';
import { OcpiPushStation } from '../../../ocpi/src/entities/ocpi-push-station.entity';
import { Amenity } from './amenity.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Media } from './media.entity';

@Entity('stations')
@Index(['clientId'])
@Index(['vendorId'])
export class Station {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) stationUniqueId: string | null;
  @Column({ type: 'int', nullable: true }) vendorId: number | null;
  @Column({ type: 'enum', enum: StationType, default: 'Public' }) stationType: StationType;
  @Column({ type: 'enum', enum: StationStatus }) status: StationStatus;
  @Column({ type: 'int', nullable: true }) createdBy: number | null;
  @Column({ type: 'int', nullable: true }) createdStaffId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) location: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) helpNumber: string | null;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;
  @Column({ type: 'datetime', nullable: true }) deletedAt: Date | null;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @OneToOne(() => Location, (location) => location.station)
  stationLocation?: Location;

  @OneToMany(() => Charger, (charger) => charger.station)
  chargers: Charger[];

  @OneToMany(() => StationAmenity, (sa) => sa.station)
  stationAmenities: StationAmenity[];

  @OneToMany(() => StationFavourite, (sf) => sf.station)
  stationFavourites?: StationFavourite[];

  @OneToMany(() => OcpiPushStation, (ops) => ops.station)
  ocpiPushStations?: OcpiPushStation[];

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'createdBy' })
  createdVendor?: Vendor | null;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'createdStaffId' })
  createdStaff?: Staff | null;

  @ManyToMany(() => Amenity)
  @JoinTable({
    name: 'stationamenities',
    joinColumn: { name: 'stationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'amenityId', referencedColumnName: 'id' },
  })
  amenities?: Amenity[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'stationfavourites',
    joinColumn: { name: 'stationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  favouritedByUsers?: User[];

  @OneToMany(() => OcpiPushStation, (ops) => ops.station)
  pushed_emsps_stations?: OcpiPushStation[];

  @OneToMany(() => Media, (media) => media.station)
  stationMedia?: Media[];
}

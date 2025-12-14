namespace dms;

using { cuid, managed } from '@sap/cds/common';

entity Users : cuid, managed {
  userId   : String(80);
  role     : String(20);          // USER | ADMIN | SUPER_ADMIN
  maxMB    : Decimal(10,2);
  usedMB   : Decimal(10,2);
}

entity Documents : cuid, managed {
  title        : String(120);
  ownerId      : String(80);
  status       : String(1) default 'A';   // A/D
  lastActionBy : String(80);

  versions : Composition of many Versions
    on versions.document = $self;
}

entity Versions : cuid, managed {
  document   : Association to Documents;
  verNo      : Integer;

  fileName   : String(255);
  mimeType   : String(100);
  sizeBytes  : Integer64;
  md5        : String(32);

  status     : String(1) default 'A';     // A/D
  actionBy   : String(80);

  file       : Association to Files;
}

entity Logs : cuid, managed {
  action  : String(20);                   // UPLOAD/DOWNLOAD/DELETE/RESTORE/OVERWRITE
  status  : String(1);                    // S/F
  detail  : String(255);

  docID   : UUID;
  verID   : UUID;
  userId  : String(80);
}

entity Files : cuid, managed {
  @Core.MediaType : mimeType
  content   : LargeBinary;

  mimeType  : String(100);
  fileName  : String(255);
  sizeBytes : Integer64;
  md5       : String(32);
}

service DMSService {
  entity Documents as projection on dms.Documents;
  entity Versions  as projection on dms.Versions;
  entity Files     as projection on dms.Files;

  @readonly entity Logs as projection on dms.Logs;

  action UploadVersion(
    docID        : UUID,
    fileName     : String,
    mimeType     : String,
    md5          : String,
    conflictMode : String   // RENAME | KEEP_BOTH | OVERWRITE
  ) returns Versions;

  action DeleteVersion(verID : UUID) returns Boolean;
  action DeleteDocument(docID : UUID) returns Boolean;
  action RestoreVersion(verID : UUID) returns Boolean;
}

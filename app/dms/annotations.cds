using dms.DMSService as service from '../../db/schema';
using from '../../db/schema';

annotate service.Documents with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : ID,
            Label : 'ID',
        },
        {
            $Type : 'UI.DataField',
            Value : title,
            Label : 'Title',
        },
        {
            $Type : 'UI.DataField',
            Value : ownerId,
            Label : 'OwnerId',
        },
        {
            $Type : 'UI.DataField',
            Value : status,
            Label : 'Status',
        },
        {
            $Type : 'UI.DataField',
            Value : createdAt,
        },
        {
            $Type : 'UI.DataField',
            Value : createdBy,
        },
        {
            $Type : 'UI.DataField',
            Value : lastActionBy,
            Label : 'lastActionBy',
        },
        {
            $Type : 'UI.DataField',
            Value : modifiedAt,
        },
        {
            $Type : 'UI.DataField',
            Value : modifiedBy,
        },
    ],
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Details',
            ID : 'Details',
            Target : '@UI.FieldGroup#Details',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Versions',
            ID : 'Versions',
            Target : 'versions/@UI.LineItem#Versions',
        },
    ],
    UI.FieldGroup #Details : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : ID,
                Label : 'ID',
            },
            {
                $Type : 'UI.DataField',
                Value : ownerId,
                Label : 'OwnerId',
            },
            {
                $Type : 'UI.DataField',
                Value : title,
                Label : 'Title',
            },
            {
                $Type : 'UI.DataField',
                Value : status,
                Label : 'Status',
            },
            {
                $Type : 'UI.DataField',
                Value : createdAt,
            },
            {
                $Type : 'UI.DataField',
                Value : createdBy,
            },
            {
                $Type : 'UI.DataField',
                Value : lastActionBy,
                Label : 'Last Action By',
            },
            {
                $Type : 'UI.DataField',
                Value : modifiedAt,
            },
            {
                $Type : 'UI.DataField',
                Value : modifiedBy,
            },
        ],
    },
);

annotate service.Versions with @(
    UI.LineItem #Versions : [
        {
            $Type : 'UI.DataField',
            Value : file.ID,
            Label : 'ID',
        },
        {
            $Type : 'UI.DataField',
            Value : file.fileName,
            Label : 'File Name',
        },
        {
            $Type : 'UI.DataField',
            Value : file.content,
            Label : 'Content',
        },
        {
            $Type : 'UI.DataField',
            Value : file.md5,
            Label : 'MD5',
        },
        {
            $Type : 'UI.DataField',
            Value : file.sizeBytes,
            Label : 'File Size',
        },
        {
            $Type : 'UI.DataField',
            Value : file.mimeType,
            Label : 'MIME Type',
        },
        {
            $Type : 'UI.DataField',
            Value : file.createdAt,
        },
        {
            $Type : 'UI.DataField',
            Value : file.createdBy,
        },
        {
            $Type : 'UI.DataField',
            Value : file.modifiedAt,
        },
        {
            $Type : 'UI.DataField',
            Value : file.modifiedBy,
        },
    ]
);

